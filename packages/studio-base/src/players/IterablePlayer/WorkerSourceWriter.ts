// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as Comlink from "comlink";

import { abortSignalTransferHandler } from "@foxglove/comlink-transfer-handlers";
import Log from "@foxglove/log";
import { Attachment, Immutable, Metadata } from "@foxglove/studio";
import {
  ISourceWriter,
  SourceWriterInitializeArgs,
} from "@foxglove/studio-base/players/IterablePlayer/ISourceWriter";
import { WorkerSourceWriterWorker } from "@foxglove/studio-base/players/IterablePlayer/WorkerSourceWriterWorker";

const log = Log.getLogger(__filename);

Comlink.transferHandlers.set("abortsignal", abortSignalTransferHandler);

type ConstructorArgs = {
  initWorker: () => Worker;
  initArgs: SourceWriterInitializeArgs;
};

export class WorkerSourceWriter implements ISourceWriter {
  readonly #args: ConstructorArgs;

  #thread?: Worker;
  #worker?: Comlink.Remote<WorkerSourceWriterWorker>;

  public constructor(args: ConstructorArgs) {
    this.#args = args;
  }

  public async initialize(): Promise<void> {
    // Note: this launches the worker.
    this.#thread = this.#args.initWorker();

    const initialize = Comlink.wrap<
      (args: SourceWriterInitializeArgs) => Comlink.Remote<WorkerSourceWriterWorker>
    >(this.#thread);

    const worker = (this.#worker = await initialize(this.#args.initArgs));

    log.info(worker);
    await worker.initialize();
  }

  public async writeAttachments(attachments: Immutable<Attachment[]>): Promise<void> {
    if (this.#worker == undefined) {
      throw new Error(`WorkerSourceWriter is not initialized`);
    }
    await this.#worker.writeAttachments(attachments);
  }

  public async writeMetadata(metadata: Immutable<Metadata[]>): Promise<void> {
    if (this.#worker == undefined) {
      throw new Error(`WorkerSourceWriter is not initialized`);
    }
    await this.#worker.writeMetadata(metadata);
  }

  public async terminateWriter(): Promise<void> {
    if (this.#worker == undefined) {
      throw new Error(`WorkerSourceWriter is not initialized`);
    }
    await this.#worker.terminateWriter();
  }
}
