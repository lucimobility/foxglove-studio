// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { produce } from "immer";
import * as _ from "lodash-es";
import { useCallback, useEffect } from "react";

import { SettingsTreeAction, SettingsTreeNodes } from "@foxglove/studio";
import { usePanelSettingsTreeUpdate } from "@foxglove/studio-base/providers/PanelStateContextProvider";
import { SaveConfig } from "@foxglove/studio-base/types/panels";

import { MetadataConfig } from "./types";

export const defaultConfig: MetadataConfig = {
  buttonText: "Add Metadata",
  buttonTooltip: "",
  value: "{}",
};

const buildSettingsTree = (config: MetadataConfig): SettingsTreeNodes => ({
  general: {
    fields: {},
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

export function useMetadataPanelSettings(
  config: MetadataConfig,
  saveConfig: SaveConfig<MetadataConfig>,
  datatypes: string[],
): void {
  const updatePanelSettingsTree = usePanelSettingsTreeUpdate();

  const actionHandler = useCallback(
    (action: SettingsTreeAction) => {
      if (action.action !== "update") {
        return;
      }
      const { path, value } = action.payload;

      saveConfig(
        produce<MetadataConfig>((draft) => {
          _.set(draft, path.slice(1), value);
        }),
      );
    },
    [saveConfig],
  );

  useEffect(() => {
    updatePanelSettingsTree({
      actionHandler,
      nodes: buildSettingsTree(config),
    });
  }, [actionHandler, config, datatypes, updatePanelSettingsTree]);
}
