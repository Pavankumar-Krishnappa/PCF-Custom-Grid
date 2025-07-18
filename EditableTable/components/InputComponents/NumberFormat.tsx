/* eslint-disable react/display-name */
import { FontIcon, SpinButton, Stack } from '@fluentui/react';
import React, { memo, useEffect, useState } from 'react';
import { IDataverseService } from '../../services/DataverseService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  asteriskClassStyle,
  numberFormatStyles,
} from '../../styles/ComponentsStyles';
import { formatCurrency, formatDecimal, formatNumber } from '../../utils/formattingUtils';
import { CurrencySymbol, NumberFieldMetadata } from '../../store/features/NumberSlice';
import { ErrorIcon } from '../ErrorIcon';
import { setInvalidFields } from '../../store/features/ErrorSlice';

export interface INumberProps {
  fieldId: string;
  fieldName: string | undefined;
  value: string;
  rowId?: string;
  isRequired: boolean;
  isDisabled: boolean;
  isSecured: boolean;
  _onChange: Function;
  _service: IDataverseService;
}

export const NumberFormat = memo(({ fieldId, fieldName, value, rowId, isRequired, isDisabled,
  isSecured, _onChange, _service } : INumberProps) => {
  const dispatch = useAppDispatch();

  const numbers = useAppSelector(state => state.number.numberFieldsMetadata);
  const currencySymbols = useAppSelector(state => state.number.currencySymbols);
  const changedRecords = useAppSelector(state => state.record.changedRecords);
  const changedRecord = changedRecords.find(transaction => transaction.id === rowId);
  const changedTransactionId = changedRecord?.data.find(data =>
    data.fieldName === 'transactioncurrencyid');

  // Get the Invoice amount from the main dataset row
  const rows = useAppSelector(state => state.dataset.rows);
  const currentRow = rows.find(row => row.key === rowId);
  const invoiceAmountColumn = currentRow?.columns.find(col =>
    col.schemaName === 'a_04b6d9baaa2840ac9f6b05c104588d0d.nb_invoice_amt');
  const invoiceAmount = invoiceAmountColumn?.rawValue ? Number(invoiceAmountColumn.rawValue) : 0;
  console.log('Invoice Amount Column:', invoiceAmountColumn);
  console.log('Invoice Amount Raw Value:', invoiceAmount);
  console.log('Changed Record:', changedRecord);
  console.log('All Changed Fields:', changedRecord?.data);

  // State for currentCurrency
  const [currentCurrency, setCurrentCurrency] = useState<CurrencySymbol | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (changedTransactionId?.newValue && typeof changedTransactionId.newValue === 'string') {
      const match = changedTransactionId.newValue.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        const transactionId = match[1];
        _service.getCurrencyById(transactionId).then(result => {
          if (isMounted) {
            setCurrentCurrency({ recordId: rowId || '',
              symbol: result.symbol, precision: result.precision });
          }
        });
      }
    }
    else {
      // fallback to currencySymbols from store
      const found = currencySymbols.find(currency => currency.recordId === rowId) ?? null;
      setCurrentCurrency(found);
    }
    return () => { isMounted = false; };
  }, [changedTransactionId, currencySymbols, rowId, _service]);

  const currentNumber = numbers.find(num => num.fieldName === fieldName);

  function changeNumberFormat(currentCurrency: CurrencySymbol | null,
    currentNumber: NumberFieldMetadata | undefined,
    precision: number | undefined,
    newValue?: string) {
    const numberValue = formatNumber(_service, newValue!);
    const stringValue = currentCurrency && currentNumber?.isBaseCurrency !== undefined
      ? formatCurrency(_service, numberValue || 0,
        precision, currentCurrency?.symbol)
      : formatDecimal(_service, numberValue || 0, currentNumber?.precision);
    _onChange(numberValue, stringValue);
  }

  const onNumberChange = (newValue?: string) => {
    if (newValue === '') {
      _onChange(null, '');
      dispatch(setInvalidFields({ fieldId, isInvalid: false, errorMessage: '' }));
    }
    else if (currentCurrency && currentNumber) {
      // Add validation for nb_invoice_posting_amt
      if (fieldName === 'nb_invoice_posting_amt' && invoiceAmount !== undefined) {
        const enteredValue = formatNumber(_service, newValue!);
        if (enteredValue > invoiceAmount) {
          dispatch(setInvalidFields({
            fieldId,
            isInvalid: true,
            errorMessage: `Invoice value (${formatCurrency(_service, enteredValue,
              currentCurrency.precision, currentCurrency.symbol)}) cannot exceed
              the Invoice amount of ${formatCurrency(_service, Number(invoiceAmount),
    currentCurrency.precision, currentCurrency.symbol)}`,
          }));
          // Do NOT call _onChange here, just return so the input keeps the user's value
          return;
        }
      }
      // Only update value if valid
      if (currentNumber?.precision === 2) {
        changeNumberFormat(currentCurrency, currentNumber, currentCurrency.precision, newValue);
      }
      else {
        changeNumberFormat(currentCurrency, currentNumber, currentNumber.precision, newValue);
      }
      dispatch(setInvalidFields({ fieldId, isInvalid: false, errorMessage: '' }));
    }
    else {
      // If currency is not loaded yet, skip validation and formatting
      console.log('Currency not loaded yet, skipping validation/formatting');
    }
  };

  const checkValidation = (newValue: string) => {
    if (isRequired && !newValue) {
      dispatch(setInvalidFields({ fieldId, isInvalid: true,
        errorMessage: 'Required fields must be filled in.' }));
    }
  };

  return (
    <Stack>
      <SpinButton
        min={currentNumber?.minValue}
        max={currentNumber?.maxValue}
        precision={currentNumber?.precision ?? 0}
        styles={numberFormatStyles(isRequired,
          currentNumber?.isBaseCurrency || isDisabled || isSecured)}
        value={value}
        disabled={currentNumber?.isBaseCurrency || isDisabled || isSecured}
        title={value}
        onBlur={(event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          const elem = event.target as HTMLInputElement;
          if (value !== elem.value) {
            onNumberChange(elem.value);
          }
          checkValidation(elem.value);
        }}
        onFocus={() => dispatch(setInvalidFields({ fieldId, isInvalid: false, errorMessage: '' }))}
      />
      <FontIcon iconName={'AsteriskSolid'} className={asteriskClassStyle(isRequired)}/>
      <ErrorIcon id={fieldId} isRequired={isRequired} />
    </Stack>
  );
});
