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

import * as _ from "lodash-es";
import { useCallback } from "react";

import { useDeepMemo } from "@foxglove/hooks";
import { Attachment } from "@foxglove/studio";
import { useAttachmentReducer } from "@foxglove/studio-base/PanelAPI/useAttachmentReducer";
import { SubscribeAttachmentPayload } from "@foxglove/studio-base/players/types";
import concatAndTruncate from "@foxglove/studio-base/util/concatAndTruncate";

// Topic types that are not known at compile time
type UnknownAttachmentsByName = Record<string, readonly Attachment[]>;

/**
 * useMessagesByTopic makes it easy to request some messages on some topics.
 *
 * Using this hook will cause the panel to re-render when new messages arrive on the requested topics.
 * - During file playback the panel will re-render when the file is playing or when the user is scrubbing.
 * - During live playback the panel will re-render when new messages arrive.
 */
export function useAttachmentsByName(params: {
  attachmentSubscriptions: readonly string[] | SubscribeAttachmentPayload[];
  historySize: number;
}): Record<string, readonly Attachment[]> {
  const { historySize, attachmentSubscriptions } = params;
  const requestedAttachments = useDeepMemo(attachmentSubscriptions);

  const addAttachments = useCallback(
    (prevAttachmentsByName: UnknownAttachmentsByName, attachments: readonly Attachment[]) => {
      const newAttachmentsByName = _.groupBy(attachments, "name");
      const ret: UnknownAttachmentsByName = { ...prevAttachmentsByName };
      Object.entries(newAttachmentsByName).forEach(([name, newAttachments]) => {
        const retName = ret[name];
        if (retName) {
          ret[name] = concatAndTruncate(retName, newAttachments, historySize);
        }
      });
      return ret;
    },
    [historySize],
  );

  const restore = useCallback(
    (prevAttachmentsByName?: UnknownAttachmentsByName) => {
      const newAttachmentsByName: UnknownAttachmentsByName = {};
      // When changing topics, we try to keep as many messages around from the previous set of
      // topics as possible.
      for (const attachment of requestedAttachments) {
        const attachmentName = typeof attachment === "string" ? attachment : attachment.name;
        const prevAttachments = prevAttachmentsByName?.[attachmentName];
        newAttachmentsByName[attachmentName] = prevAttachments?.slice(-historySize) ?? [];
      }
      return newAttachmentsByName;
    },
    [requestedAttachments, historySize],
  );

  return useAttachmentReducer({
    attachmentNames: requestedAttachments,
    restore,
    addAttachments,
  });
}
