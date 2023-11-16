// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useMemo } from "react";

import { filterMap } from "@foxglove/den/collection";
import { useShallowMemo } from "@foxglove/hooks";
import * as PanelAPI from "@foxglove/studio-base/PanelAPI";
import {
  MessageDataItemsByPath,
  useDecodeMessagePathsForMessagesByTopic,
} from "@foxglove/studio-base/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import { subscribePayloadFromAttachmentName } from "@foxglove/studio-base/players/subscribePayloadFromAttachmentName";

// Given a set of message paths, subscribe to the appropriate topics and return
// messages with their queried data decoded for each path.
export default function useAttachmentsByPath(
  paths: string[],
  historySize: number = Infinity,
): MessageDataItemsByPath {
  const memoizedPaths: string[] = useShallowMemo(paths);
  const subscribeAttachments = useMemo(
    () => filterMap(memoizedPaths, (path) => subscribePayloadFromAttachmentName(path)),
    [memoizedPaths],
  );

  const attachmentsByName = PanelAPI.useAttachmentsByName({
    attachmentSubscriptions: subscribeAttachments,
    historySize,
  });

  const decodeMessagePathsForMessagesByTopic =
    useDecodeMessagePathsForMessagesByTopic(memoizedPaths);
  return useMemo(
    () => decodeMessagePathsForMessagesByTopic(attachmentsByName),
    [decodeMessagePathsForMessagesByTopic, attachmentsByName],
  );
}
