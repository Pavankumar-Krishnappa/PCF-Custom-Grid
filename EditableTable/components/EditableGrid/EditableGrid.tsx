import React, { useState, useRef } from 'react';
import {
  ColumnActionsMode,
  ConstrainMode,
  ContextualMenu,
  DetailsList,
  DetailsListLayoutMode,
  DirectionalHint,
  IColumn,
  IContextualMenuProps,
  IDetailsList,
  Stack,
} from '@fluentui/react';

import { useSelection } from '../../hooks/useSelection';
import { useLoadStore } from '../../hooks/useLoadStore';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

import { CommandBar } from './CommandBar';
import { GridFooter } from './GridFooter';
import { GridCell } from './GridCell';

import {
  clearChangedRecords,
  clearChangedRecordsAfterRefresh,
  deleteRecords,
  readdChangedRecordsAfterDelete,
  saveRecords,
} from '../../store/features/RecordSlice';
import { setLoading } from '../../store/features/LoadingSlice';
import {
  addNewRow,
  readdNewRowsAfterDelete,
  removeNewRows,
  setRows,
} from '../../store/features/DatasetSlice';

import { Row, Column, mapDataSetColumns,
  mapDataSetRows, getColumnsTotalWidth } from '../../mappers/dataSetMapper';
import { _onRenderDetailsHeader } from '../../styles/RenderStyles';
import { buttonStyles } from '../../styles/ButtonStyles';
import { gridStyles } from '../../styles/DetailsListStyles';
import { IDataSetProps } from '../AppWrapper';
import { getContainerHeight } from '../../utils/commonUtils';
import { clearInvalidFields } from '../../store/features/ErrorSlice';

const ASC_SORT = 0;
const DESC_SORT = 1;

export const EditableGrid = ({ _service, _setContainerHeight,
  dataset, isControlDisabled, width }: IDataSetProps) => {
  const { selection, selectedRecordIds } = useSelection();

  const rows: Row[] = useAppSelector(state => state.dataset.rows);
  const newRows: Row[] = useAppSelector(state => state.dataset.newRows);
  const columns = mapDataSetColumns(dataset, _service);
  const isPendingDelete = useAppSelector(state => state.record.isPendingDelete);
  const isPendingLoad = useAppSelector(state => state.dataset.isPending);
  const [sortMenuProps, setSortMenuProps] = useState<IContextualMenuProps | undefined>(undefined);
  const [chequeStatus, setChequeStatus] = useState<number | undefined>(undefined);
  const [duplicateKeys, setDuplicateKeys] = useState<string[]>([]);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const dispatch = useAppDispatch();

  const detailsListRef = useRef<IDetailsList>(null);

  const resetScroll = () => {
    if (detailsListRef.current) {
      detailsListRef.current.scrollToIndex(0);
    }
  };

  const refreshButtonHandler = () => {     
    dispatch(setLoading(true));
    dataset.refresh(); // Actually refresh the grid from the server
    dispatch(clearChangedRecords());
    dispatch(clearChangedRecordsAfterRefresh());
    dispatch(removeNewRows());
    dispatch(clearInvalidFields());
  };

  const newButtonHandler = () => {
    const emptyColumns = columns.map<Column>(column => ({
      schemaName: column.key,
      rawValue: '',
      formattedValue: '',
      type: column.data,
    }));
    resetScroll();
    dispatch(addNewRow({
      key: Date.now().toString(),
      columns: emptyColumns,
    }));
    _setContainerHeight(getContainerHeight(rows.length + 1));
  };

  const deleteButtonHandler = () => {
    dispatch(setLoading(true));
    dispatch(deleteRecords({ recordIds: selectedRecordIds, _service })).unwrap()
      .then(recordsAfterDelete => {
        dataset.refresh();
        dispatch(readdNewRowsAfterDelete(recordsAfterDelete.newRows));
      })
      .catch(error => {
        if (!error) {
          _service.openErrorDialog(error).then(() => {
            dispatch(setLoading(false));
          });
        }
        dispatch(setLoading(false));
      });
  };

  // Save button handler with duplicate nb_supplierreference validation
  const saveButtonHandler = () => {
    dispatch(setLoading(true));
    dispatch(saveRecords(_service)).unwrap()
      .then(() => {
        dataset.refresh(); // Only refresh after save
        dispatch(removeNewRows());
        // After save, update inactive state for all rows
        const allRowIds = rows.map(row => row.key);
        dispatch(require('./../../store/features/DatasetSlice').setInactiveRecords({ recordIds: allRowIds, _service }));
        // No notification
      })
      .catch(error =>
        _service.openErrorDialog(error).then(() => {
          dispatch(setLoading(false));
        }));
  };

  React.useEffect(() => {
    const datasetRows = [
      ...newRows,
      ...mapDataSetRows(dataset),
    ];
    dispatch(setRows(datasetRows));
    dispatch(clearChangedRecords());
    dispatch(readdChangedRecordsAfterDelete());
    dispatch(setLoading(isPendingDelete || isPendingLoad));
    _setContainerHeight(getContainerHeight(rows.length));
  }, [dataset, isPendingLoad]);

  // On mount, get cheque status from Form Context (main record)
  React.useEffect(() => {
    const fetchChequeStatus = async () => {
      try {
        const parentMetadata = _service.getParentMetadata?.();
        if (parentMetadata?.entityId) {
          const record = await _service.getContext().webAPI.retrieveRecord(
            'nb_ae_chequeregister',
            parentMetadata.entityId,
            '?$select=nb_chequestatus'
          );
          if (record && typeof record.nb_chequestatus === 'number') {
            setChequeStatus(record.nb_chequestatus);
          }
        }
      } catch (e) {
        // fallback: do not enable buttons
        setChequeStatus(undefined);
      }
    };
    fetchChequeStatus();
  }, [_service]);

  useLoadStore(dataset, _service);

  const _renderItemColumn = (item: Row, index: number | undefined, column: IColumn | undefined) =>
    <GridCell row={item} currentColumn={column!} _service={_service} index={index} />;

  const sort = (sortDirection: ComponentFramework.PropertyHelper.DataSetApi.Types.SortDirection,
    column?: IColumn) => {
    if (column?.fieldName) {
      dispatch(setLoading(true));
      const newSorting: ComponentFramework.PropertyHelper.DataSetApi.SortStatus = {
        name: column.fieldName,
        sortDirection,
      };

      while (dataset.sorting.length > 0) {
        dataset.sorting.pop();
      }
      dataset.sorting.push(newSorting);
      dataset.paging.reset();
      dataset.refresh();
    }
  };

  const onHideSortMenu = React.useCallback(() => setSortMenuProps(undefined), []);

  const getSortMenuProps =
  (ev?: React.MouseEvent<HTMLElement>, column?: IColumn): IContextualMenuProps => {
    const items = [
      { key: 'sortAsc', text: 'Sort Ascending', onClick: () => sort(ASC_SORT, column) },
      { key: 'sortDesc', text: 'Sort Descending', onClick: () => sort(DESC_SORT, column) },
    ];
    return {
      items,
      target: ev?.currentTarget as HTMLElement,
      gapSpace: 2,
      isBeakVisible: false,
      directionalHint: DirectionalHint.bottomLeftEdge,
      onDismiss: onHideSortMenu,
    };
  };

  const _onColumnClick = (ev?: React.MouseEvent<HTMLElement, MouseEvent>, column?: IColumn) => {
    if (column?.columnActionsMode !== ColumnActionsMode.disabled) {
      setSortMenuProps(getSortMenuProps(ev, column));
    }
  };



  return <div className='container'>
    <Stack horizontal horizontalAlign="end" className={buttonStyles.buttons}>
      <CommandBar
        refreshButtonHandler={refreshButtonHandler}
        newButtonHandler={newButtonHandler}
        deleteButtonHandler={deleteButtonHandler}
        saveButtonHandler={saveButtonHandler}
        isControlDisabled={isControlDisabled}
        selectedCount={selectedRecordIds.length}
        chequeStatus={chequeStatus}
      ></CommandBar>
    </Stack>
    <DetailsList
      componentRef={detailsListRef}
      key={getColumnsTotalWidth(dataset) > width ? 0 : width}
      items={rows}
      columns={columns}
      onRenderItemColumn={(item, index, column) => <GridCell row={item} currentColumn={column!} _service={_service} index={index} />} 
      selection={selection}
      onRenderRow={ (props, defaultRender) => {
        return (
          <div
            onDoubleClick={event => {
              const target = event.target as HTMLInputElement;
              if (!target.className.includes('Button')) {
                _service.openForm(props?.item.key);
              }
            }}
          >
            {defaultRender!(props)}
          </div>
        );
      }}
      onRenderDetailsHeader={_onRenderDetailsHeader}
      layoutMode={DetailsListLayoutMode.fixedColumns}
      styles={gridStyles(rows.length)}
      onColumnHeaderClick={_onColumnClick}
      constrainMode={ ConstrainMode.unconstrained}
    >
    </DetailsList>
    {sortMenuProps && <ContextualMenu {...sortMenuProps} />}
    {duplicateMessage && (
      <Stack horizontalAlign='center' style={{ color: 'red', margin: 8 }}>
        <span>{duplicateMessage}</span>
      </Stack>
    )}
    {successMessage && (
      <Stack horizontalAlign='center' style={{ color: 'green', margin: 8 }}>
        <span>{successMessage}</span>
      </Stack>
    )}
    {rows.length === 0 &&
      <Stack horizontalAlign='center' className='noDataContainer'>
        <div className='nodata'><span>No data available</span></div>
      </Stack>
    }
    <GridFooter
      dataset={dataset}
      selectedCount={selectedRecordIds.length}
      resetScroll={resetScroll}
    ></GridFooter>
  </div>;
};
