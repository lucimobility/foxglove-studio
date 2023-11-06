// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as Comlink from "comlink";

import { abortSignalTransferHandler } from "@foxglove/comlink-transfer-handlers";
import { Attachment, Metadata } from "@foxglove/studio";
import { SourceWriter } from "@foxglove/studio-base/players/IterablePlayer/Writer";

import type { Initalization } from "./IIterableSource";

export class WorkerSourceWriterWorker implements SourceWriter {
  protected _source: SourceWriter;

  public constructor(source: SourceWriter) {
    this._source = source;
  }

  public async initialize(): Promise<Initalization> {
    return await this._source.initialize();
  }

  public async writeAttachments(attachments: Attachment[]): Promise<void> {
    this._source.writeAttachments(attachments);
  }

  public async writeMetadata(metadata: Metadata[]): Promise<void> {
    this._source.writeMetadata(metadata);
  }
}

Comlink.transferHandlers.set("abortsignal", abortSignalTransferHandler);
