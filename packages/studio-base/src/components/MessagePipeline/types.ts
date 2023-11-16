// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Time } from "@foxglove/rostime";
import { Attachment, Immutable, MessageEvent, Metadata, ParameterValue } from "@foxglove/studio";
import { BuiltinPanelExtensionContext } from "@foxglove/studio-base/components/PanelExtensionAdapter";
import {
  AdvertiseOptions,
  PlayerState,
  PublishPayload,
  SubscribeAttachmentPayload,
  SubscribePayload,
  Topic,
} from "@foxglove/studio-base/players/types";
import { RosDatatypes } from "@foxglove/studio-base/types/RosDatatypes";

type ResumeFrame = () => void;
export type MessagePipelineContext = Immutable<{
  playerState: PlayerState;
  sortedTopics: Topic[];
  attachmentNames: string[];
  datatypes: RosDatatypes;
  subscriptions: SubscribePayload[];
  attachmentSubscriptions: SubscribeAttachmentPayload[];
  messageEventsBySubscriberId: Map<string, MessageEvent[]>;
  setSubscriptions: (id: string, subscriptionsForId: Immutable<SubscribePayload[]>) => void;
  setAttachmentSubscriptions: (
    id: string,
    subscriptionsForId: Immutable<SubscribeAttachmentPayload[]>,
  ) => void;
  setPublishers: (id: string, publishersForId: AdvertiseOptions[]) => void;
  setParameter: (key: string, value: ParameterValue) => void;
  publish: (request: PublishPayload) => void;
  callService: (service: string, request: unknown) => Promise<unknown>;
  fetchAsset: BuiltinPanelExtensionContext["unstable_fetchAsset"];
  startPlayback?: () => void;
  pausePlayback?: () => void;
  playUntil?: (time: Time) => void;
  setPlaybackSpeed?: (speed: number) => void;
  seekPlayback?: (time: Time) => void;
  // Don't render the next frame until the returned function has been called.
  pauseFrame: (name: string) => ResumeFrame;

  writeAttachments: (attachments: Attachment[]) => void;
  writeMetadata: (metadata: Metadata[]) => void;
}>;
