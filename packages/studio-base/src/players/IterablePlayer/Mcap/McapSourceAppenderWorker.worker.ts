// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as Comlink from "comlink";

import Log from "@foxglove/log";
import { SourceAppenderInitializeArgs } from "@foxglove/studio-base/players/IterablePlayer/SourceAppender";
import { WorkerSourceAppenderWorker } from "@foxglove/studio-base/players/IterablePlayer/WorkerSourceAppenderWorker";

import { McapSourceAppender } from "./McapSourceAppender";

const log = Log.getLogger(__filename);

export function initialize(args: SourceAppenderInitializeArgs): WorkerSourceAppenderWorker {
  log.info(args);
  if (args.handle && args.file) {
    const source = new McapSourceAppender({ type: "file", file: args.file, handle: args.handle });
    const wrapped = new WorkerSourceAppenderWorker(source);
    return Comlink.proxy(wrapped);
  }

  throw new Error("handle required");
}

Comlink.expose(initialize);
