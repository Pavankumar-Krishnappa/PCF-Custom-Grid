/* eslint-disable react/display-name */
import React, { memo } from 'react';
import {
  DatePicker,
  defaultDatePickerStrings,
  Stack,
  ComboBox,
  IComboBox,
  IComboBoxOption,
  FontIcon,
} from '@fluentui/react';
import {
  asteriskClassStyle,
  timePickerStyles,
  datePickerStyles,
  stackComboBox,
} from '../../styles/ComponentsStyles';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { shallowEqual } from 'react-redux';
import {
  getDateFormatWithHyphen,
  setTimeForDate,
  getTimeKeyFromTime,
  getTimeKeyFromDate,
  formatTimeto12Hours,
} from '../../utils/dateTimeUtils';
import {
  formatUTCDateTimeToUserDate,
  formatUserDateTimeToUTC,
  formatDateShort,
  parseDateFromString,
} from '../../utils/formattingUtils';
import { timesList } from './timeList';
import { IDataverseService } from '../../services/DataverseService';
import { ErrorIcon } from '../ErrorIcon';
import { setInvalidFields } from '../../store/features/ErrorSlice';

export interface IDatePickerProps {
  fieldId: string;
  fieldName: string;
  dateOnly: boolean;
  value: string | null;
  isDisabled: boolean;
  isRequired: boolean;
  isSecured: boolean;
  _onChange: any;
  _service: IDataverseService;
}

export const DateTimeFormat = memo(({ fieldName, fieldId, dateOnly, value, isDisabled, isSecured,
  isRequired, _onChange, _service }: IDatePickerProps) => {
  let timeKey: string | number | undefined;
  const options = [...timesList];

  const dispatch = useAppDispatch();
  const dateFields = useAppSelector(state => state.date.dates, shallowEqual);
  const currentDateMetadata = dateFields.find(dateField => dateField.fieldName === fieldName);
  const dateBehavior = currentDateMetadata?.dateBehavior ?? '';

  let currentDate: Date | undefined = value
    ? dateBehavior === 'TimeZoneIndependent'
      ? formatUserDateTimeToUTC(_service, new Date(value), 4)
      : formatUTCDateTimeToUserDate(_service, value)
    : undefined;

  if (currentDate !== undefined && !isNaN(currentDate.getTime())) {
    const newKey = getTimeKeyFromDate(currentDate);
    timeKey = newKey;
    if (options.find(option => option.key === newKey) === undefined) {
      options.push({
        key: newKey,
        text: formatTimeto12Hours(currentDate),
      });
    }
  }
  else {
    timeKey = undefined;
  }

  const checkValidation = (newValue: Date | null | undefined) => {
    if (isRequired && (newValue === undefined || newValue === null || isNaN(newValue.getTime()))) {
      dispatch(setInvalidFields(
        { fieldId, isInvalid: true, errorMessage: 'Required fields must be filled in.' }));
    }
    else {
      dispatch(setInvalidFields({ fieldId, isInvalid: false, errorMessage: '' }));
    }
  };

  const setChangedDateTime = (date: Date | undefined, key: string | number | undefined) => {
    const currentDateTime = setTimeForDate(date, key?.toString());
    if (currentDateTime !== undefined) {
      if (dateBehavior === 'TimeZoneIndependent') {
        _onChange(`${getDateFormatWithHyphen(currentDateTime)}T${key ?? '00:00'}:00Z`);
      }
      else {
        const dateInUTC = formatUserDateTimeToUTC(_service, currentDateTime, 1);
        _onChange(`${getDateFormatWithHyphen(dateInUTC)}T${getTimeKeyFromDate(dateInUTC)}:00Z`);
      }
    }
  };

  const onDateChange = (date: Date | null | undefined) => {
    if (date !== null && date !== undefined) {
      if (dateOnly) {
        currentDate = date;
        _onChange(`${getDateFormatWithHyphen(date)}T00:00:00Z`);
      }
      else {
        setChangedDateTime(date, timeKey);
      }
    }
    else if (!(currentDate === undefined && date === null)) {
      _onChange(null);
    }
    checkValidation(date);
  };

  const onTimeChange = (event: React.FormEvent<IComboBox>, option?: IComboBoxOption,
    index?: number, value?: string): void => {
    let key = option?.key;
    if (!option && value) {
      key = getTimeKeyFromTime(value);
      if (key !== '') {
        options.push({ key: key!, text: value.toUpperCase() });
      }
    }
    timeKey = key;
    if (key) {
      setChangedDateTime(currentDate, key);
    }
  };

  const localizedStrings = {
    ...defaultDatePickerStrings,
    shortDays: _service.getWeekDayNamesShort(),
    shortMonths: _service.getMonthNamesShort(),
    months: _service.getMonthNamesLong(),
  };

  return (
    <Stack styles={stackComboBox}>
      <DatePicker
        allowTextInput
        value={currentDate}
        onSelectDate={onDateChange}
        formatDate={(date?: Date) => date ? formatDateShort(_service, date) : ''}
        parseDateFromString={(newValue: string): Date => parseDateFromString(_service, newValue)}
        strings={localizedStrings}
        styles={datePickerStyles(dateOnly ? isRequired : false)}
        firstDayOfWeek={_service.getFirstDayOfWeek()}
        disabled={isDisabled || isSecured}
        onAfterMenuDismiss={() => checkValidation(currentDate)}
        onClick={() => dispatch(setInvalidFields({ fieldId, isInvalid: false, errorMessage: '' }))}
        title={currentDate?.toDateString()}
      />
      {!dateOnly &&
        <ComboBox
          options={options}
          allowFreeform={true}
          onChange={onTimeChange}
          styles={timePickerStyles(isRequired)}
          selectedKey={timeKey}
          title={timeKey?.toString()}
          disabled={isDisabled || isSecured}
          onBlur={() => checkValidation(currentDate)}
        />
      }
      <FontIcon iconName={'AsteriskSolid'} className={asteriskClassStyle(isRequired)} />
      <ErrorIcon id={fieldId} isRequired={isRequired} />
    </Stack>
  );
});
