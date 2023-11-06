// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as Comlink from "comlink";

import { abortSignalTransferHandler } from "@foxglove/comlink-transfer-handlers";
import Logger from "@foxglove/log";
import { Attachment, Metadata } from "@foxglove/studio";
import { WorkerSourceWriterWorker } from "@foxglove/studio-base/players/IterablePlayer/WorkerSourceWriterWorker";
import { SourceWriter } from "@foxglove/studio-base/players/IterablePlayer/Writer";

import type { Initalization, IterableSourceInitializeArgs } from "./IIterableSource";

const log = Logger.getLogger(__filename);

Comlink.transferHandlers.set("abortsignal", abortSignalTransferHandler);

type ConstructorArgs = {
  initWorker: () => Worker;
  initArgs: IterableSourceInitializeArgs;
};

export class WorkerSourceWriter implements SourceWriter {
  readonly #args: ConstructorArgs;

  #thread?: Worker;
  #worker?: Comlink.Remote<WorkerSourceWriterWorker>;

  public constructor(args: ConstructorArgs) {
    this.#args = args;
  }

  public async initialize(): Promise<Initalization> {
    // Note: this launches the worker.
    this.#thread = this.#args.initWorker();

    const initialize = Comlink.wrap<
      (args: IterableSourceInitializeArgs) => Comlink.Remote<WorkerSourceWriterWorker>
    >(this.#thread);

    const worker = (this.#worker = await initialize(this.#args.initArgs));
    return await worker.initialize();
  }

  public async writeAttachments(attachments: Attachment[]): Promise<void> {
    log.info("in WorkerSourceWriter writeAttachments function");
    if (this.#worker == undefined) {
      throw new Error(`WorkerSourceWriter is not initialized`);
    }

    await this.#worker.writeAttachments(attachments);
  }

  public async writeMetadata(metadata: Metadata[]): Promise<void> {
    log.info("in WorkerSourceWriter writeMetadata function");
    if (this.#worker == undefined) {
      throw new Error(`WorkerSourceWriter is not initialized`);
    }

    await this.#worker.writeMetadata(metadata);
  }

  public async terminate(): Promise<void> {
    this.#thread?.terminate();
  }
}
