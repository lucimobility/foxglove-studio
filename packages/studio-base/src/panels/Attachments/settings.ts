// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { produce } from "immer";
import * as _ from "lodash-es";
import { useCallback, useEffect } from "react";

import { SettingsTreeAction, SettingsTreeNodes } from "@foxglove/studio";
import { usePanelSettingsTreeUpdate } from "@foxglove/studio-base/providers/PanelStateContextProvider";
import { SaveConfig } from "@foxglove/studio-base/types/panels";

import { AttachmentConfig } from "./types";

export const defaultConfig: AttachmentConfig = {
  buttonText: "Add Attachment",
  buttonTooltip: "",
};

// function buildSampleAttachment(datatype: string): unknown {
//   const builtin = builtinSampleValues[datatype];
//   if (builtin != undefined) {
//     return builtin;
//   }
//   const obj = {};
//   return obj;
// }

function datatypeError(mediaTypes: string[], datatype?: string) {
  if (!datatype) {
    return "Media type cannot be empty";
  }
  if (!mediaTypes.includes(datatype)) {
    return "Media type not found";
  }
  return undefined;
}

const buildSettingsTree = (config: AttachmentConfig, mediaTypes: string[]): SettingsTreeNodes => ({
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

// const getSampleAttachment = (datatypes: string[], datatype?: string): string | undefined => {
//   if (datatype == undefined) {
//     return undefined;
//   }

//   const sampleAttachment = buildSampleAttachment(datatypes, datatype);
//   return JSON.stringify(sampleAttachment, undefined, 2);
// };

export function useAttachmentPanelSettings(
  config: AttachmentConfig,
  saveConfig: SaveConfig<AttachmentConfig>,
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
        produce<AttachmentConfig>((draft) => {
          if (input === "autocomplete") {
            if (_.isEqual(path, ["general", "datatype"])) {
              // const sampleAttachment = getSampleAttachment(datatypes, value);

              draft.datatype = value;

              // if (sampleAttachment) {
              //   draft.value = sampleAttachment;
              // }
            }
          } else {
            _.set(draft, path.slice(1), value);
          }
        }),
      );
    },
    [saveConfig],
  );

  useEffect(() => {
    updatePanelSettingsTree({
      actionHandler,
      nodes: buildSettingsTree(config, datatypes),
    });
  }, [actionHandler, config, datatypes, updatePanelSettingsTree]);
}
