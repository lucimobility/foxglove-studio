// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Button, Dialog, DialogTitle, DialogActions, Typography } from "@mui/material";
import { useCallback, useState } from "react";

import Log from "@foxglove/log";
import useTerminateWriter from "@foxglove/studio-base/hooks/useTerminateWriter";

const log = Log.getLogger(__filename);

export function CreateSaveChangesDialog(props: { onClose: () => void }): JSX.Element {
  const { onClose } = props;

  const terminateWriter = useTerminateWriter();

  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const terminateWriterAndClose = useCallback(() => {

    log.info("here");
    try {
      terminateWriter();
    } catch (e) {
      // TODO this is never catching?
      setErrorMessage(e);
    }

    onClose();
  }, [onClose, terminateWriter]);

  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>Save Changes and Close File</DialogTitle>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={terminateWriterAndClose}
        >
          Save and Close
        </Button>
        {errorMessage != undefined && (
          <Typography variant="caption" noWrap color={errorMessage ? "error" : undefined}>
            {errorMessage}
          </Typography>
        )}
      </DialogActions>
    </Dialog>
  );
}
