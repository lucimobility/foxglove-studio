// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { McapWriter } from "@mcap/core";
import { open } from "fs/promises";

import Log from "@foxglove/log";
import { Attachment, Metadata } from "@foxglove/studio";
import { FileHandleWritable } from "@foxglove/studio-base/players/IterablePlayer/Mcap/BlobWritable";
import { McapIndexedSourceWriter } from "@foxglove/studio-base/players/IterablePlayer/Mcap/McapIndexedSourceWriter";
import { SourceWriter } from "@foxglove/studio-base/players/IterablePlayer/Writer";

import { Initalization } from "../IIterableSource";

const log = Log.getLogger(__filename);

type McapSource = { type: "file"; file: File } | { type: "url"; url: string };

/**
 * Create a McapIndexedReader if it will be possible to do an indexed read. If the file is not
 * indexed or is empty, returns undefined.
 */
async function tryCreateWriter(fileHandleWritable: FileHandleWritable) {
  try {
    const writer = new McapWriter({
      writable: fileHandleWritable,
      useStatistics: true,
      useChunks: true,
      useChunkIndex: true,
    });
    return writer;
  } catch (err) {
    log.error(err);
    return undefined;
  }
}

export class McapSourceWriter implements SourceWriter {
  #source: McapSource;
  #sourceWriter: SourceWriter | undefined;

  public constructor(source: McapSource) {
    this.#source = source;
  }

  public async initialize(): Promise<Initalization> {
    const source = this.#source;

    switch (source.type) {
      case "file": {
        // Ensure the file is readable before proceeding (will throw in the event of a permission
        // error). Workaround for the fact that `file.stream().getReader()` returns a generic
        // "network error" in the event of a permission error.
        await source.file.slice(0, 1).arrayBuffer();

        const fileHandle = await open(source.file.name, "w");
        log.info("file name", source.file.name);
        const fileHandleWritable = new FileHandleWritable(fileHandle);
        const writer = await tryCreateWriter(fileHandleWritable);
        if (writer) {
          this.#sourceWriter = new McapIndexedSourceWriter(writer);
          log.info("writer: ", writer);
          log.info(this.#sourceWriter);
        }

        // const readable = new BlobReadable(source.file);
        // const reader = await tryCreateIndexedReader(readable);
        // if (reader) {
        //   this.#sourceImpl = new McapIndexedIterableSource(reader);
        //   log.info("Source impl = indexed iterable", reader);
        //   log.info(this.#sourceImpl);
        // } else {
        //   this.#sourceImpl = new McapUnindexedIterableSource({
        //     size: source.file.size,
        //     stream: source.file.stream(),
        //   });
        // }
        break;
      }
      case "url": {
        throw new Error('Not implemented yet: "url" case');
      }
      // case "url": {
      // const readable = new RemoteFileReadable(source.url);
      // await readable.open();
      // const reader = await tryCreateIndexedReader(readable);
      // if (reader) {
      //   this.#sourceImpl = new McapIndexedIterableSource(reader);
      // } else {
      //   const response = await fetch(source.url);
      //   if (!response.body) {
      //     throw new Error(`Unable to stream remote file. <${source.url}>`);
      //   }
      //   const size = response.headers.get("content-length");
      //   if (size == undefined) {
      //     throw new Error(`Remote file is missing Content-Length header. <${source.url}>`);
      //   }

      //   this.#sourceImpl = new McapUnindexedIterableSource({
      //     size: parseInt(size),
      //     stream: response.body,
      //   });
      // }
      //   break;
      // }
    }

    return await this.#sourceWriter!.initialize();
  }

  public async writeAttachments(attachments: Attachment[]): Promise<void> {
    if (!this.#sourceWriter) {
      throw new Error("Invariant: uninitialized");
    }

    this.#sourceWriter.writeAttachments(attachments);
  }

  public async writeMetadata(metadata: Metadata[]): Promise<void> {
    if (!this.#sourceWriter) {
      throw new Error("Invariant: uninitialized");
    }

    this.#sourceWriter.writeMetadata(metadata);
  }
}
