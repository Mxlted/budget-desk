import { Button, Group, Modal, Stack, Text } from '@mantine/core';

export interface ConfirmDetails {
  title: string;
  body: string;
  confirmLabel: string;
  color: string;
  onConfirm: () => void;
}

interface ConfirmModalProps {
  opened: boolean;
  details: ConfirmDetails | null;
  onClose: () => void;
  onConfirm: () => void;
}

const DESCRIPTION_ID = 'confirm-modal-description';

export function ConfirmModal({ opened, details, onClose, onConfirm }: ConfirmModalProps) {
  // Render an empty placeholder modal when there are no details — the modal is
  // effectively never shown without details, but we keep the component tree
  // stable to avoid Mantine portal churn.
  const title = details?.title ?? '';
  const body = details?.body ?? '';
  const confirmLabel = details?.confirmLabel ?? 'Confirm';
  const color = details?.color ?? 'blue';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      aria-describedby={DESCRIPTION_ID}
    >
      <Stack gap="md">
        <Text id={DESCRIPTION_ID} size="sm" c="dimmed">
          {body}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button color={color} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
