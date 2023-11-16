// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Log from "@foxglove/log";
import { MessagePathPart } from "@foxglove/studio-base/components/MessagePathSyntax/constants";
import parseRosPath from "@foxglove/studio-base/components/MessagePathSyntax/parseRosPath";

import { SubscribeMetadataPayload } from "./types";

const log = Log.getLogger(__filename);

/**
 * Builds a SubscribePayload from a message path, requesting a specific field of the message if the
 * message path resolves to a field name.
 */
export function subscribePayloadFromMetadataName(
  path: string,
): undefined | SubscribeMetadataPayload {
  return {
    name: path,
  };

  log.info(path);
  const parsedPath = parseRosPath(path);

  if (!parsedPath) {
    return undefined;
  }

  type NamePart = MessagePathPart & { type: "name" };

  const firstField = parsedPath.messagePath.find(
    (element): element is NamePart => element.type === "name",
  );

  if (!firstField) {
    return { topic: parsedPath.topicName, preloadType: preloadType ?? "partial" };
  }

  return {
    topic: parsedPath.topicName,
    preloadType: preloadType ?? "partial",
    fields: [firstField.name],
  };
}
