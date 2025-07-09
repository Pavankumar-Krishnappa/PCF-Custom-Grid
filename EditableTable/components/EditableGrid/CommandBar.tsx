import { CommandBarButton, IButtonStyles } from '@fluentui/react';
import * as React from 'react';
import { useAppSelector } from '../../store/hooks';
import { commandBarButtonStyles } from '../../styles/ButtonStyles';
import { addIcon, refreshIcon, deleteIcon, saveIcon } from '../../styles/ButtonStyles';
import { IIconProps } from '@fluentui/react/lib/components/Icon/Icon.types';

export interface ICommandBarProps {
  refreshButtonHandler: () => void;
  newButtonHandler: () => void;
  deleteButtonHandler: () => void;
  saveButtonHandler: () => void;
  isControlDisabled: boolean;
  selectedCount: number;
  chequeStatus?: number; // Add chequeStatus prop
}

type ButtonProps = {
  order: number,
  text: string,
  icon: IIconProps,
  disabled: boolean,
  onClick: () => void,
  styles?: IButtonStyles,
}

export const CommandBar = (props: ICommandBarProps) => {
  const isLoading = useAppSelector(state => state.loading.isLoading);
  const isPendingSave = useAppSelector(state => state.record.isPendingSave);
  const entityPrivileges = useAppSelector(state => state.dataset.entityPrivileges);

  // Only enable New, Save, Delete, Refresh if chequeStatus is Forth Coming
  const isActionEnabled = props.chequeStatus === 100000001;
  const isRefreshEnabled = isActionEnabled;

  const buttons: ButtonProps[] = [
    // New Button
    {
      order: 1,
      text: 'New',
      icon: addIcon,
      disabled: isLoading || props.isControlDisabled || !entityPrivileges.create || !isActionEnabled,
      onClick: props.newButtonHandler,
    },
    // Refresh Button 
    {
      order: 2,
      text: 'Refresh',
      icon: refreshIcon,
      disabled: isLoading || !isRefreshEnabled,
      onClick: props.refreshButtonHandler,
    },
    // Delete Button 
    {
      order: 3,
      text: 'Delete',
      icon: deleteIcon,
      disabled: isLoading || props.isControlDisabled || !entityPrivileges.delete || !isActionEnabled,
      onClick: props.deleteButtonHandler,
    },
    // Save Button
    {
      order: 4,
      text: 'Save',
      icon: saveIcon,
      disabled: isLoading || !isPendingSave || props.isControlDisabled || !isActionEnabled,
      onClick: props.saveButtonHandler,
    },
  ];

  const listButtons = buttons.map(button =>
    <CommandBarButton
      key={button.order}
      disabled={button.disabled}
      iconProps={button.icon}
      styles={button.styles ?? commandBarButtonStyles}
      text={button.text}
      onClick={button.onClick}
    />);

  return <>
    {listButtons}
  </>;
};
