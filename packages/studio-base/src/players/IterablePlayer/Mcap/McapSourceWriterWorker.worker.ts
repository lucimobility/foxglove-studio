// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as Comlink from "comlink";

import Logger from "@foxglove/log";
import { WorkerSourceWriterWorker } from "@foxglove/studio-base/players/IterablePlayer/WorkerSourceWriterWorker";
import { IterableSourceInitializeArgs } from "@foxglove/studio-base/players/IterablePlayer/Writer";

import { McapSourceWriter } from "./McapSourceWriter";

const log = Logger.getLogger(__filename);

export function initialize(args: IterableSourceInitializeArgs): WorkerSourceWriterWorker {
  log.info("in WorkerSourceWriterWorker.worker");
  if (args.file) {
    const source = new McapSourceWriter({ type: "file", file: args.file });
    const wrapped = new WorkerSourceWriterWorker(source);
    return Comlink.proxy(wrapped);
  }

  throw new Error("file required");
}

Comlink.expose(initialize);
