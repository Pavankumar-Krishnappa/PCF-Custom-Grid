import {
  IDetailsHeaderStyles,
  IDetailsListStyles,
  IDetailsRowStyles,
} from '@fluentui/react';
import { IStackStyles } from '@fluentui/react/lib/components/Stack/Stack.types';
import { mergeStyleSets } from '@fluentui/react/lib/Styling';

export const stackStyles: Partial<IStackStyles> = { root: { height: 44, marginLeft: 100 } };

export const detailsHeaderStyles: Partial<IDetailsHeaderStyles> = mergeStyleSets({
  root: {
    backgroundColor: 'white',
    fontSize: '12px',
    paddingTop: '0px',
    borderTop: '1px solid rgb(215, 215, 215)',
    position: 'sticky',
    top: '44px',
    zIndex: '3',
  },
});

export const detailsRowStyles: Partial<IDetailsRowStyles> = {
  root: {
    backgroundColor: 'white',
    fontSize: '14px',
    color: 'black',
    borderTop: '1px solid rgb(250, 250, 250)',
    borderBottom: '1px solid rgb(219 219 219)',
  },
};

export const gridStyles = (rowsLength: number): Partial<IDetailsListStyles> => mergeStyleSets({
  contentWrapper: {
    padding: rowsLength === 0 ? '50px' : '0',
  },
});
