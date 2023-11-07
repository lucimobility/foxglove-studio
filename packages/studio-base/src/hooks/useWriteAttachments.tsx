// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useCallback } from "react";

import Log from "@foxglove/log";
import { Attachment } from "@foxglove/studio";
import { useMessagePipeline } from "@foxglove/studio-base/components/MessagePipeline";
import { PlayerCapabilities } from "@foxglove/studio-base/players/types";

const log = Log.getLogger(__filename);

// Registers a publisher with the player and returns a publish() function to publish data. This uses
// no-op functions if the player does not have the `advertise` capability
export default function useWriteAttachments(): (attachments: Attachment[]) => void {
  const canWrite = useMessagePipeline((context) =>
    context.playerState.capabilities.includes(PlayerCapabilities.append),
  );

  const writeAttachments = useMessagePipeline((context) => context.writeAttachments);

  return useCallback(
    (attachments) => {
      log.info("can write? use write attachments ", canWrite);

      if (canWrite) {
        writeAttachments(attachments);
      }
    },
    [canWrite, writeAttachments],
  );
}
