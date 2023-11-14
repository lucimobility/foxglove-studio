// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { produce } from "immer";
import * as _ from "lodash-es";
import { useCallback, useEffect } from "react";

import { SettingsTreeAction, SettingsTreeNodes } from "@foxglove/studio";
import buildSampleMessage from "@foxglove/studio-base/panels/Attachments/buildSampleMessage";
import { usePanelSettingsTreeUpdate } from "@foxglove/studio-base/providers/PanelStateContextProvider";
import { SaveConfig } from "@foxglove/studio-base/types/panels";

import { PublishConfig } from "./types";

export const defaultConfig: PublishConfig = {
  buttonText: "Publish",
  buttonTooltip: "",
  advancedView: true,
  value: "{}",
};

function datatypeError(schemaNames: string[], datatype?: string) {
  if (!datatype) {
    return "Message schema cannot be empty";
  }
  if (!schemaNames.includes(datatype)) {
    return "Schema name not found";
  }
  return undefined;
}

const buildSettingsTree = (config: PublishConfig, mediaTypes: string[]): SettingsTreeNodes => ({
  general: {
    fields: {
      datatype: {
        label: "Media Type",
        input: "autocomplete",
        error: datatypeError(mediaTypes, config.datatype),
        items: mediaTypes,
        value: config.datatype ?? "",
      },
    },
  },
  button: {
    label: "Button",
    fields: {
      buttonText: { label: "Title", input: "string", value: config.buttonText },
      buttonTooltip: { label: "Tooltip", input: "string", value: config.buttonTooltip },
      buttonColor: { label: "Color", input: "rgb", value: config.buttonColor },
    },
  },
});

const getSampleMessage = (
  // datatypes: Immutable<RosDatatypes>,
  datatypes: string[],
  datatype?: string,
): string | undefined => {
  if (datatype == undefined) {
    return undefined;
  }

  const sampleMessage = buildSampleMessage(datatypes, datatype);
  // const sampleMessage: Record<string, unknown> = { name: "" };
  return JSON.stringify(sampleMessage, undefined, 2);
};

export function useAttachmentPanelSettings(
  config: PublishConfig,
  saveConfig: SaveConfig<PublishConfig>,
  // datatypes: Immutable<RosDatatypes>,
  datatypes: string[],
): void {
  const updatePanelSettingsTree = usePanelSettingsTreeUpdate();
  // const mediaTypes = useMemo(() => Array.from(datatypes.keys()).sort(), [datatypes]);

  const actionHandler = useCallback(
    (action: SettingsTreeAction) => {
      if (action.action !== "update") {
        return;
      }
      const { path, value, input } = action.payload;

      saveConfig(
        produce<PublishConfig>((draft) => {
          if (input === "autocomplete") {
            if (_.isEqual(path, ["general", "datatype"])) {
              const sampleMessage = getSampleMessage(datatypes, value);

              draft.datatype = value;

              if (sampleMessage) {
                draft.value = sampleMessage;
              }
            }
          } else {
            _.set(draft, path.slice(1), value);
          }
        }),
      );
    },
    [datatypes, saveConfig],
  );

  useEffect(() => {
    updatePanelSettingsTree({
      actionHandler,
      nodes: buildSettingsTree(config, datatypes),
    });
  }, [actionHandler, config, datatypes, updatePanelSettingsTree]);
}
