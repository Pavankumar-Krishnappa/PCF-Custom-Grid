import React, { useCallback, useState, useEffect } from 'react';
import { IColumn } from '@fluentui/react';

import { LookupFormat } from '../InputComponents/LookupFormat';
import { NumberFormat } from '../InputComponents/NumberFormat';
import { OptionSetFormat } from '../InputComponents/OptionSetFormat';
import { DateTimeFormat } from '../InputComponents/DateTimeFormat';
import { WholeFormat } from '../InputComponents/WholeFormat';

import { Column, isNewRow, Row } from '../../mappers/dataSetMapper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateRow } from '../../store/features/DatasetSlice';
import { setChangedRecords } from '../../store/features/RecordSlice';
import { IDataverseService } from '../../services/DataverseService';
import { TextFormat } from '../InputComponents/TextFormat';
import { boldGrayCellStyle } from '../../styles/ComponentsStyles';

export interface IGridSetProps {
  row: Row,
  currentColumn: IColumn,
  _service: IDataverseService;
  index: number | undefined;
  onChequeStatusChange?: (chequeStatus?: number) => void;
}

export type ParentEntityMetadata = {
  entityId: string,
  entityRecordName: string,
  entityTypeName: string
};

// Modernize GridCell: use React.memo, arrow function, and hooks best practices
export const GridCell = React.memo(({ _service, row, currentColumn, index, onChequeStatusChange }: IGridSetProps) => {
  const dispatch = useAppDispatch();
  const cell = row.columns.find((column: Column) => column.schemaName === currentColumn.key);
  const [isInvoiceSelected, setIsInvoiceSelected] = React.useState(false);

  // Check if this row has an invoice selected
  React.useEffect(() => {
    const supplierRefCell =
      row.columns.find((column: Column) => column.schemaName === 'nb_supplierreference');
    setIsInvoiceSelected(!!supplierRefCell?.rawValue);
  }, [row.columns]);

  const fieldsRequirementLevels = useAppSelector(state => state.dataset.requirementLevels);
  const fieldRequirementLevel = React.useMemo(
    () => fieldsRequirementLevels.find(requirementLevel =>
      requirementLevel.fieldName === currentColumn.key),
    [fieldsRequirementLevels, currentColumn.key]
  );
  const isRequired = fieldRequirementLevel?.isRequired || false;

  const calculatedFields = useAppSelector(state => state.dataset.calculatedFields);
  const calculatedField = React.useMemo(
    () => calculatedFields.find(field => field.fieldName === currentColumn.key),
    [calculatedFields, currentColumn.key]
  );
  const isCalculatedField = calculatedField?.isCalculated || false;

  const securedFields = useAppSelector(state => state.dataset.securedFields);
  const securedField = React.useMemo(
    () => securedFields.find(field => field.fieldName === currentColumn.key),
    [securedFields, currentColumn.key]
  );
  let hasUpdateAccess = securedField?.hasUpdateAccess || false;

  let parentEntityMetadata: ParentEntityMetadata | undefined;
  let ownerEntityMetadata: string | undefined;
  if (isNewRow(row)) {
    parentEntityMetadata = _service.getParentMetadata();
    ownerEntityMetadata = currentColumn.data === 'Lookup.Owner'
      ? _service.getCurrentUserName() : undefined;
    hasUpdateAccess = securedField?.hasCreateAccess || false;
  }

  const inactiveRecords = useAppSelector(state => state.dataset.inactiveRecords);
  const inactiveRecord = React.useMemo(
    () => inactiveRecords.find(record => record.recordId === row.key),
    [inactiveRecords, row.key]
  );
  const isInactiveRecord = inactiveRecord?.isInactive || false;

  const _changedValue = React.useCallback(
    (newValue: any, rawValue?: any, lookupEntityNavigation?: string): void => {
      dispatch(setChangedRecords({
        id: row.key,
        fieldName: lookupEntityNavigation || currentColumn.key,
        fieldType: currentColumn.data,
        newValue,
      }));
      dispatch(updateRow({
        rowKey: row.key,
        columnName: currentColumn.key,
        newValue: rawValue ?? newValue,
      }));
    }, [dispatch, row.key, currentColumn.key, currentColumn.data]
  );

  const handleInvoiceSelection = React.useCallback(async (selected: boolean, invoiceTag?: any) => {
    setIsInvoiceSelected(selected);
    if (selected && invoiceTag && invoiceTag.key) {
      try {
        // Fetch invoice details including currency
        const invoice = await _service.getContext().webAPI.retrieveRecord(
          'nb_ae_invoice',
          invoiceTag.key,
          '?$select=nb_invoice_amt,_transactioncurrencyid_value',
        );
        const invoiceAmount = invoice.nb_invoice_amt;
        const currencyId = invoice._transactioncurrencyid_value;
        // Update Invoice amount in the row
        dispatch(updateRow({
          rowKey: row.key,
          columnName: 'a_04b6d9baaa2840ac9f6b05c104588d0d.nb_invoice_amt',
          newValue: invoiceAmount,
        }));
        // Fetch and store currency info for this row
        if (currencyId) {
          const currency = await _service.getCurrencyById(currencyId);
          dispatch({
            type: 'number/addCurrencySymbol',
            payload: {
              recordId: row.key,
              symbol: currency.symbol,
              precision: currency.precision,
            },
          });
        }
        // Force grid refresh to show related data immediately
        // if (_service && _service.getContext && _service.getContext().parameters?.dataset?.refresh) {
        //   _service.getContext().parameters.dataset.refresh();
        // }
      } catch (error) {
        console.error('Failed to fetch invoice details or currency:', error);
      }
    }
  }, [dispatch, row.key, _service]);

  // Handler to forward chequeStatus up to parent
  const handleInvoiceSelectedWithStatus = React.useCallback(
    (selected: boolean, invoiceTag?: any, chequeStatus?: number) => {
      handleInvoiceSelection(selected, invoiceTag);
      if (typeof onChequeStatusChange === 'function' && typeof chequeStatus !== 'undefined') {
        onChequeStatusChange(chequeStatus);
      }
    },
    [handleInvoiceSelection, onChequeStatusChange]
  );

  const props = React.useMemo(() => ({
    fieldName: currentColumn?.fieldName ? currentColumn?.fieldName : '',
    rowId: row.key,
    fieldId: `${currentColumn?.fieldName || ''}${row.key}`,
    formattedValue: cell?.formattedValue,
    isRequired,
    isDisabled: isInactiveRecord || isCalculatedField ||
      (!isInvoiceSelected && currentColumn.key !== 'nb_supplierreference' &&
        currentColumn.key !== 'nb_invoice_posting_amt'),
    isSecured: !hasUpdateAccess,
    _service,
    index,
    ownerValue: ownerEntityMetadata,
    _onChange: _changedValue,
  }), [currentColumn, row.key, cell, isRequired, isInactiveRecord, isCalculatedField, isInvoiceSelected, hasUpdateAccess, _changedValue, _service, index, ownerEntityMetadata]);

  if (currentColumn !== undefined && cell !== undefined) {
    switch (currentColumn.data) {
      case 'DateAndTime.DateAndTime':
        return <span className={boldGrayCellStyle}><DateTimeFormat dateOnly={false} value={cell.rawValue} {...props} /></span>;
      case 'DateAndTime.DateOnly':
        return <span className={boldGrayCellStyle}><DateTimeFormat dateOnly={true} value={cell.rawValue} {...props} /></span>;
      case 'Lookup.Simple':
        return <span className={boldGrayCellStyle}><LookupFormat
          value={cell.lookup}
          parentEntityMetadata={parentEntityMetadata}
          onInvoiceSelected={
            currentColumn.key === 'nb_supplierreference' ? handleInvoiceSelectedWithStatus : undefined
          }
          {...props}
        /></span>;
      case 'Lookup.Customer':
      case 'Lookup.Owner':
        return <span className={boldGrayCellStyle}><TextFormat value={cell.formattedValue} {...props} isDisabled={true} /></span>;
      case 'OptionSet':
        return <span className={boldGrayCellStyle}><OptionSetFormat value={cell.rawValue} isMultiple={false} {...props} /></span>;
      case 'TwoOptions':
        return <span className={boldGrayCellStyle}><OptionSetFormat value={cell.rawValue} isMultiple={false} isTwoOptions={true}
          {...props} /></span>;
      case 'MultiSelectPicklist':
        return <span className={boldGrayCellStyle}><OptionSetFormat value={cell.rawValue} isMultiple={true} {...props} /></span>;
      case 'Decimal':
        return <span className={boldGrayCellStyle}><NumberFormat value={cell.formattedValue ?? ''} {...props} /></span>;
      case 'Currency':
        return <span className={boldGrayCellStyle}><NumberFormat value={cell.formattedValue ?? ''} {...props} /></span>;
      case 'FP':
        return <span className={boldGrayCellStyle}><NumberFormat value={cell.formattedValue ?? ''} {...props} /></span>;
      case 'Whole.None':
        return <span className={boldGrayCellStyle}><NumberFormat value={cell.formattedValue ?? ''} {...props} /></span>;
      case 'Whole.Duration':
        return <span className={boldGrayCellStyle}><WholeFormat value={cell.rawValue} type={'duration'} {...props} /></span>;
      case 'Whole.Language':
        return <span className={boldGrayCellStyle}><WholeFormat value={cell.rawValue} type={'language'} {...props} /></span>;
      case 'Whole.TimeZone':
        return <span className={boldGrayCellStyle}><WholeFormat value={cell.rawValue} type={'timezone'} {...props} /></span>;
      case 'SingleLine.Text':
      case 'Multiple':
      default:
        return <span className={boldGrayCellStyle}><TextFormat value={cell.formattedValue || ''} type={cell.type} {...props} /></span>;
    }
  }
  return <></>;
});
