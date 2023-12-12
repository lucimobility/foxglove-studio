// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ISeekableWriter, McapTypes, McapWriter } from "@mcap/core";

import Log from "@foxglove/log";
import { Attachment, Metadata } from "@foxglove/studio";
import { ISourceWriter } from "@foxglove/studio-base/players/IterablePlayer/ISourceWriter";

const log = Log.getLogger(__filename);

type McapSource = { type: "file"; file: File; handle: FileSystemFileHandle };

class FileHandleReadableWritable implements ISeekableWriter, McapTypes.IReadable {
  #handle: FileSystemWritableFileStream;
  #totalBytesWritten = 0;

  public constructor(
    handle: FileSystemWritableFileStream,
    private file: Blob,
  ) {
    this.#handle = handle;
  }

  public async write(buffer: Uint8Array): Promise<void> {
    await this.#handle.write({ type: "write", data: buffer });
    this.#totalBytesWritten += buffer.byteLength;
  }

  public position(): bigint {
    return BigInt(this.#totalBytesWritten);
  }

  public async seek(position: bigint): Promise<void> {
    this.#totalBytesWritten = Number(position);
    await this.#handle.seek(Number(position));
  }

  public async close(): Promise<void> {
    await this.#handle.close();
  }

  public async size(): Promise<bigint> {
    return BigInt(this.file.size);
  }

  public async read(offset: bigint, size: bigint): Promise<Uint8Array> {
    if (offset + size > this.file.size) {
      throw new Error(
        `Read of ${size} bytes at offset ${offset} exceeds file size ${this.file.size}`,
      );
    }
    return new Uint8Array(
      await this.file.slice(Number(offset), Number(offset + size)).arrayBuffer(),
    );
  }
}

async function delay(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryCreateWriter(fileHandleReadableWritable: FileHandleReadableWritable) {
  try {
    const writer = await McapWriter.InitializeInAppendMode(fileHandleReadableWritable);
    return writer;
  } catch (err) {
    log.error(err);
    return undefined;
  }
}

export class McapSourceWriter implements ISourceWriter {
  #source: McapSource;
  #writer: McapWriter | undefined;
  #fileHandleReadableWritable: FileHandleReadableWritable | undefined;

  #terminated: boolean = false;

  public constructor(source: McapSource) {
    this.#source = source;
  }

  public async initialize(): Promise<void> {
    const source = this.#source;

    // Ensure the file is readable before proceeding (will throw in the event of a permission
    // error). Workaround for the fact that `file.stream().getReader()` returns a generic
    // "network error" in the event of a permission error.
    await source.file.slice(0, 1).arrayBuffer();

    const writable = await source.handle.createWritable({ keepExistingData: true });
    const fileHandleReadableWritable = new FileHandleReadableWritable(writable, source.file);

    const writer = await tryCreateWriter(fileHandleReadableWritable);
    if (writer != undefined) {
      this.#fileHandleReadableWritable = fileHandleReadableWritable;
      this.#writer = writer;

      log.debug("writer: ", writer);
    }
  }

  public async writeAttachments(attachments: Attachment[]): Promise<void> {
    if (!this.#writer || !this.#fileHandleReadableWritable) {
      throw new Error("Invariant: uninitialized");
    }
    if (this.#terminated) {
      throw new Error("Terminate has been called. Cannot write to a closed file.");
    }

    for await (const attachment of attachments) {
      log.debug("writing attachment: ", attachment);

      await this.#writer.addAttachment({
        name: attachment.name,
        logTime: attachment.logTime ?? BigInt(0),
        createTime: attachment.createTime ?? BigInt(0),
        data: attachment.data,
        mediaType: attachment.mediaType,
      });
    }
  }

  public async writeMetadata(metadata: Metadata[]): Promise<void> {
    if (!this.#writer || !this.#fileHandleReadableWritable) {
      throw new Error("Invariant: uninitialized");
    }

    if (this.#terminated) {
      throw new Error("Terminate has been called. Cannot write to a closed file.");
    }

    for await (const data of metadata) {
      log.debug("writing metadata: ", data);

      await this.#writer.addMetadata(data);
    }
  }

  public async terminateWriter(): Promise<void> {
    if (!this.#writer || !this.#fileHandleReadableWritable) {
      throw new Error("Invariant: uninitialized");
    }

    if (this.#terminated) {
      throw new Error("Terminate has already been called. Cannot call again.");
    }

    log.debug("Terminating Mcap Source Writer");

    this.#terminated = true;

    await this.#writer.end();
    await delay(2000);

    await this.#fileHandleReadableWritable.close();
  }
}
