// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { IAppendWritable, McapTypes, McapWriter } from "@mcap/core";

import Log from "@foxglove/log";
import { Attachment, Metadata } from "@foxglove/studio";
import { BlobReadable } from "@foxglove/studio-base/players/IterablePlayer/Mcap/BlobReadable";
import { SourceWriter } from "@foxglove/studio-base/players/IterablePlayer/SourceWriter";

const log = Log.getLogger(__filename);

type McapSource = { type: "file"; file: File; handle: FileSystemFileHandle };

// Mcap IWritable interface for nodejs FileHandle
class FileHandleWritable implements IAppendWritable {
  #handle: FileSystemWritableFileStream;
  #totalBytesWritten = 0;

  public constructor(handle: FileSystemWritableFileStream) {
    this.#handle = handle;
  }

  public async write(buffer: Uint8Array): Promise<void> {
    await this.#handle.write({ type: "write", data: buffer });
    this.#totalBytesWritten += buffer.byteLength;
  }

  public position(): bigint {
    return BigInt(this.#totalBytesWritten);
  }

  public setPosition(position: number) {
    this.#totalBytesWritten = position;
  }

  public async close(): Promise<void> {
    await this.#handle.close();
  }

  public async seek(position: bigint): Promise<void> {
    this.#totalBytesWritten = Number(position);
    await this.#handle.seek(Number(position));
  }
}

async function delay(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryCreateWriter(
  fileHandleWritable: FileHandleWritable,
  readable: McapTypes.IReadable,
) {
  try {
    const writer = await McapWriter.InitializeInAppendMode({
      readable,
      writable: fileHandleWritable,
    });
    return writer;
  } catch (err) {
    log.error(err);
    return undefined;
  }
}

export class McapSourceWriter implements SourceWriter {
  #source: McapSource;
  #writer: McapWriter | undefined;
  #fileHandleWritable: FileHandleWritable | undefined;

  public constructor(source: McapSource) {
    this.#source = source;
  }

  public async initialize(): Promise<void> {
    const source = this.#source;

    // Ensure the file is readable before proceeding (will throw in the event of a permission
    // error). Workaround for the fact that `file.stream().getReader()` returns a generic
    // "network error" in the event of a permission error.
    await source.file.slice(0, 1).arrayBuffer();

    const readable = new BlobReadable(source.file);

    const writable = await source.handle.createWritable({ keepExistingData: true });
    const fileHandleWritable = new FileHandleWritable(writable);

    const writer = await tryCreateWriter(fileHandleWritable, readable);
    if (writer) {
      this.#fileHandleWritable = fileHandleWritable;
      this.#writer = writer;

      log.info("writer: ", writer);
    }
  }

  public async writeAttachments(attachments: Attachment[]): Promise<void> {
    if (!this.#writer || !this.#fileHandleWritable) {
      throw new Error("Invariant: uninitialized");
    }

    for await (const attachment of attachments) {
      log.info("writing attachment: ", attachment);

      await this.#writer.addAttachment({
        name: attachment.name,
        logTime: attachment.logTime ?? BigInt(0),
        createTime: attachment.createTime ?? BigInt(0),
        data: attachment.data,
        mediaType: attachment.mediaType,
      });
    }

    await this.terminate();
  }

  public async writeMetadata(metadata: Metadata[]): Promise<void> {
    if (!this.#writer) {
      throw new Error("Invariant: uninitialized");
    }

    for await (const data of metadata) {
      await this.#writer.addMetadata(data);
      log.info("writing metadata: ", data);
    }

    await this.terminate();
  }

  public async terminate(): Promise<void> {
    if (!this.#writer || !this.#fileHandleWritable) {
      throw new Error("Invariant: uninitialized");
    }

    log.info("terminating -------------------");
    await this.#writer.end();
    await delay(2000);

    await this.#fileHandleWritable.close();
  }
}
