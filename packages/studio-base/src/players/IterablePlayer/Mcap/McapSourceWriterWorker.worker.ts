// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as Comlink from "comlink";

import { SourceWriterInitializeArgs } from "@foxglove/studio-base/players/IterablePlayer/ISourceWriter";
import { WorkerSourceWriterWorker } from "@foxglove/studio-base/players/IterablePlayer/WorkerSourceWriterWorker";

import { McapSourceWriter } from "./McapSourceWriter";

export function initialize(args: SourceWriterInitializeArgs): WorkerSourceWriterWorker {
  if (args.handle && args.file) {
    const source = new McapSourceWriter({ type: "file", file: args.file, handle: args.handle });
    const wrapped = new WorkerSourceWriterWorker(source);
    return Comlink.proxy(wrapped);
  }

  throw new Error("handle required");
}

Comlink.expose(initialize);
