// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as Comlink from "comlink";

import { abortSignalTransferHandler } from "@foxglove/comlink-transfer-handlers";
import { Attachment, Immutable, Metadata } from "@foxglove/studio";
import { ISourceWriter } from "@foxglove/studio-base/players/IterablePlayer/ISourceWriter";

export class WorkerSourceWriterWorker implements ISourceWriter {
  protected _source: ISourceWriter;

  public constructor(source: ISourceWriter) {
    this._source = source;
  }

  public async initialize(): Promise<void> {
    await this._source.initialize();
  }

  public async writeAttachments(attachments: Immutable<Attachment[]>): Promise<void> {
    await Comlink.proxy(this._source.writeAttachments(attachments));
  }

  public async writeMetadata(metadata: Immutable<Metadata[]>): Promise<void> {
    await Comlink.proxy(this._source.writeMetadata(metadata));
  }

  public async terminateWriter(): Promise<void> {
    await Comlink.proxy(this._source.terminateWriter());
  }
}

Comlink.transferHandlers.set("abortsignal", abortSignalTransferHandler);
