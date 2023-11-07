// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { IWritable, McapIndexedReader, McapTypes, McapAppender } from "@mcap/core";
import { AttachmentIndex, MetadataIndex } from "@mcap/core/dist/esm/src/types";

import Log from "@foxglove/log";
import { loadDecompressHandlers } from "@foxglove/mcap-support";
import { toNanoSec } from "@foxglove/rostime";
import { Attachment, Metadata } from "@foxglove/studio";
import { BlobReadable } from "@foxglove/studio-base/players/IterablePlayer/Mcap/BlobReadable";
import { SourceAppender } from "@foxglove/studio-base/players/IterablePlayer/SourceAppender";

const log = Log.getLogger(__filename);

type McapSource = { type: "file"; file: File; handle: FileSystemFileHandle };

// Mcap IWritable interface for nodejs FileHandle
class FileHandleWritable implements IWritable {
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
}

async function delay(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a McapIndexedReader if it will be possible to do an indexed read. If the file is not
 * indexed or is empty, returns undefined.
 */
async function tryCreateIndexedReader(readable: McapTypes.IReadable) {
  const decompressHandlers = await loadDecompressHandlers();
  try {
    const reader = await McapIndexedReader.Initialize({ readable, decompressHandlers });

    if (reader.chunkIndexes.length === 0 || reader.channelsById.size === 0) {
      return undefined;
    }
    return reader;
  } catch (err) {
    log.error(err);
    return undefined;
  }
}

async function tryCreateAppender(fileHandleWritable: FileHandleWritable) {
  try {
    const appender = new McapAppender({
      writable: fileHandleWritable,
      useStatistics: true,
      useChunkIndex: true,
    });
    return appender;
  } catch (err) {
    log.error(err);
    return undefined;
  }
}

export class McapSourceAppender implements SourceAppender {
  #source: McapSource;
  #appender: McapAppender | undefined;
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
    const reader = await tryCreateIndexedReader(readable);
    if (reader) {
      log.info("reader: ", reader);

      const writable = await source.handle.createWritable({ keepExistingData: true });
      const fileHandleWritable = new FileHandleWritable(writable);

      const appender = await tryCreateAppender(fileHandleWritable);
      if (appender) {
        this.#fileHandleWritable = fileHandleWritable;
        this.#appender = appender;

        log.info("appender: ", appender);

        const attachmentIndexes: AttachmentIndex[] = [];
        const metadataIndexes: MetadataIndex[] = [];

        reader.attachmentIndexes.forEach(async (attachmentIndex) => {
          attachmentIndexes.push(attachmentIndex);
        });

        reader.metadataIndexes.forEach(async (metadataIndex) => {
          metadataIndexes.push(metadataIndex);
        });

        log.info("attachment indexes: ", attachmentIndexes);
        log.info("metadata indexes: ", metadataIndexes);

        reader.schemasById.forEach(async (schema) => {
          await appender.registerSchema(schema);
        });
        reader.channelsById.forEach(async (channel) => {
          await appender.registerChannel(channel);
        });

        await delay(1000);

        attachmentIndexes.forEach(async (attachmentIndex) => {
          await appender.addAttachmentIndex(attachmentIndex);
        });

        metadataIndexes.forEach(async (metadataIndex) => {
          await appender.addMetadataIndex(metadataIndex);
        });

        reader.chunkIndexes.forEach(async (chunkIndex) => {
          await appender.addChunkIndex(chunkIndex);
        });

        await appender.setStatistics(
          reader.statistics!.messageCount,
          reader.statistics!.messageStartTime,
          reader.statistics!.messageEndTime,
          reader.statistics!.chunkCount,
          reader.statistics!.channelMessageCounts,
        );

        await writable.seek(Number(reader.dataEndOffset));
        fileHandleWritable.setPosition(Number(reader.dataEndOffset));

        // await delay(2000);

        // const array = new TextEncoder().encode(
        //   `{
        //       "frameTime": 123,
        //       "duration": 5,
        //       "tags": {
        //         "step" : true
        //       },
        //        }`,
        // );

        // await appender.addAttachment({
        //   name: "test",
        //   logTime: toNanoSec({ sec: 54321, nsec: 12345 }),
        //   createTime: toNanoSec({ sec: 12345, nsec: 54321 }),
        //   mediaType: "application/json",
        //   data: array,
        // });

        // await writer.addMetadata({
        //   name: "test",
        //   metadata: new Map(),
        // });

        // log.info("old data end offset: ", reader.dataEndOffset);

        // await delay(2000);

        // log.info(appender);

        // await appender.end();
        // await delay(2000);
        // await fileHandleWritable.close();
      }
    }
  }

  public async writeAttachments(attachments: Attachment[]): Promise<void> {
    if (!this.#appender || !this.#fileHandleWritable) {
      throw new Error("Invariant: uninitialized");
    }

    for await (const attachment of attachments) {
      log.info("writing attachment: ", attachment);
      await this.#appender.addAttachment({
        name: attachment.name,
        logTime: toNanoSec(attachment.logTime!),
        createTime: toNanoSec(attachment.createTime!),
        data: attachment.data,
        mediaType: attachment.mediaType,
      });
    }

    await this.#appender.end();
    await delay(2000);

    await this.#fileHandleWritable.close();
  }

  public async writeMetadata(metadata: Metadata[]): Promise<void> {
    if (!this.#appender) {
      throw new Error("Invariant: uninitialized");
    }

    for await (const data of metadata) {
      await this.#appender.addMetadata(data);
      log.info("writing metadata: ", data);
    }
  }

  public async terminate(): Promise<void> {
    if (!this.#appender || !this.#fileHandleWritable) {
      throw new Error("Invariant: uninitialized");
    }

    log.info("terminating -------------------");
    await this.#appender.end();
    await delay(2000);

    await this.#fileHandleWritable.close();
  }
}
