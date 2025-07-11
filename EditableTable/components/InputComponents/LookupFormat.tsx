/* eslint-disable react/display-name */
import { DefaultButton, FontIcon } from '@fluentui/react';
import { ITag, TagPicker } from '@fluentui/react/lib/Pickers';
import React, { memo, useEffect } from 'react';
import { IDataverseService } from '../../services/DataverseService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  asteriskClassStyle,
  lookupFormatStyles,
  lookupSelectedOptionStyles,
} from '../../styles/ComponentsStyles';
import { ParentEntityMetadata } from '../EditableGrid/GridCell';
import { ErrorIcon } from '../ErrorIcon';
import { setInvalidFields } from '../../store/features/ErrorSlice';
import { Entity, ErrorDetails } from '../../services/DataverseService';

const MAX_NUMBER_OF_OPTIONS = 100;
const SINGLE_CLICK_CODE = 1;

export interface ILookupProps {
  fieldId: string;
  fieldName: string;
  value: ITag | undefined;
  parentEntityMetadata: ParentEntityMetadata | undefined;
  isRequired: boolean;
  isSecured: boolean;
  isDisabled: boolean;
  _onChange: Function;
  _service: IDataverseService;
  onInvoiceSelected?: (isSelected: boolean, selectedTag?: ITag, chequeStatus?: number) => void;
}

export const LookupFormat = memo(({ fieldId, fieldName, value, parentEntityMetadata,
  isSecured, isRequired, isDisabled, _onChange, _service, onInvoiceSelected }: ILookupProps) => {
  const picker = React.useRef(null);
  const dispatch = useAppDispatch();

  const lookups = useAppSelector(state => state.lookup.lookups);
  const currentLookup = lookups.find(lookup => lookup.logicalName === fieldName);
  const options = currentLookup?.options ?? [];
  const currentOption = value ? [value] : [];
  const isOffline = _service.isOffline();

  // Add state to track filtered options
  const [filteredOptions, setFilteredOptions] = React.useState<ITag[]>([]);

  // Add effect to filter Invoice lookups
  useEffect(() => {
    const filterInvoiceLookups = async () => {
      console.log('Starting filterInvoiceLookups...');
      console.log('Field Name:', fieldName);
      console.log('Parent Entity Type:', parentEntityMetadata?.entityTypeName);
      console.log('Parent Entity ID:', parentEntityMetadata?.entityId);

      if (fieldName === 'nb_supplierreference' &&
        parentEntityMetadata?.entityTypeName === 'nb_ae_chequeregister') {
        try {
          console.log('Attempting to get parent record...');
          // Get the supplier code and cheque status from parent record using webAPI directly
          const parentRecord = await _service.getContext().webAPI.retrieveRecord(
            'nb_ae_chequeregister',
            parentEntityMetadata.entityId,
            '?$select=nb_supplier,nb_chequestatus',
          );
          console.log('Parent Record:', parentRecord);
          const supplierCode = parentRecord?.nb_supplier;
          const chequeStatus = parentRecord?.nb_chequestatus;
          console.log('Supplier Code:', supplierCode);
          console.log('Cheque Status:', chequeStatus);

          // If a callback is provided, notify parent of cheque status
          if (typeof onInvoiceSelected === 'function') {
            onInvoiceSelected(true, undefined, chequeStatus);
          }

          if (supplierCode) {
            console.log('Filtering invoices for supplier:', supplierCode);
            // Filter invoices by supplier code and status
            const filteredInvoices = await _service.retrieveMultipleRecords(
              'nb_ae_invoice',
              `?$select=nb_ae_invoiceid,nb_supplierreference&$filter=
              (nb_supplier eq '${supplierCode}' and nb_invoicestatus eq 124840000)`,
            );
            console.log('Filtered Invoices:', filteredInvoices);

            // Update the lookup options with filtered results
            if (filteredInvoices && filteredInvoices.length > 0) {
              const newFilteredOptions = filteredInvoices.map((invoice: Entity) => {
                console.log('Processing invoice:', invoice);
                const displayName = invoice.nb_supplierreference ||
                  `Supplier Ref ${invoice.nb_ae_invoiceid.substring(0, 8)}`;
                console.log('Generated display name:', displayName);
                return {
                  key: invoice.nb_ae_invoiceid,
                  name: displayName,
                };
              });
              console.log('Filtered Options:', newFilteredOptions);
              // Update both the store and local state
              dispatch({
                type: 'lookup/setLookupOptions',
                payload: {
                  logicalName: fieldName,
                  options: newFilteredOptions,
                },
              });
              setFilteredOptions(newFilteredOptions);
              console.log('Updated lookup options in store and local state');
            }
            else {
              console.log('No filtered invoices found');
              setFilteredOptions([]);
            }
          }
          else {
            console.log('No supplier code found in parent record');
            setFilteredOptions([]);
          }
        }
        catch (error: unknown) {
          console.error('Error filtering invoice lookups:', error);
          if (error && typeof error === 'object') {
            const errorObj = error as ErrorDetails;
            console.error('Error details:', {
              code: errorObj.code,
              message: errorObj.message,
              errorCode: errorObj.errorCode,
              title: errorObj.title,
              raw: errorObj.raw,
            });
          }
          setFilteredOptions([]);
        }
      }
      else {
        console.log('Not an invoice lookup or not in cheque register context');
        setFilteredOptions(options);
      }
    };

    filterInvoiceLookups();
  }, [fieldName, parentEntityMetadata, _service, dispatch, options]);

  if (value === undefined &&
    parentEntityMetadata !== undefined && parentEntityMetadata.entityId !== undefined) {
    if (currentLookup?.reference?.entityNameRef === parentEntityMetadata.entityTypeName) {
      currentOption.push({
        key: parentEntityMetadata.entityId,
        name: parentEntityMetadata.entityRecordName,
      });

      _onChange(`/${currentLookup?.entityPluralName}(${parentEntityMetadata.entityId})`,
        currentOption[0],
        currentLookup?.reference?.entityNavigation);
    }
  }

  const initialValues = (): ITag[] => {
    const optionsToUse = fieldName === 'nb_supplierreference' ? filteredOptions : options;
    if (optionsToUse.length > MAX_NUMBER_OF_OPTIONS) {
      return optionsToUse.slice(0, MAX_NUMBER_OF_OPTIONS);
    }
    return optionsToUse;
  };

  const filterSuggestedTags = (filterText: string): ITag[] => {
    if (filterText.length === 0) return [];

    const optionsToUse = fieldName === 'nb_supplierreference' ? filteredOptions : options;
    return optionsToUse.filter(tag => {
      if (tag.name === null) return false;
      return tag.name.toLowerCase().includes(filterText.toLowerCase());
    });
  };

  const onChange = (items?: ITag[] | undefined): void => {
    if (items !== undefined && items.length > 0) {
      _onChange(`/${currentLookup?.entityPluralName}(${items[0].key})`, items[0],
        currentLookup?.reference?.entityNavigation);
      if (fieldName === 'nb_supplierreference' && onInvoiceSelected) {
        onInvoiceSelected(true, items[0], undefined);
      }
    }
    else {
      _onChange(null, null, currentLookup?.reference?.entityNavigation);
      if (fieldName === 'nb_supplierreference' && onInvoiceSelected) {
        onInvoiceSelected(false, undefined, undefined);
      }
    }
  };

  const _onRenderItem = () =>
    <DefaultButton
      text={currentOption[0].name}
      title={currentOption[0].name}
      menuProps={{ items: [] }}
      split
      menuIconProps={{
        iconName: 'Cancel',
      }}
      onMenuClick={() => onChange(undefined)}
      onClick={event => {
        if (event.detail === SINGLE_CLICK_CODE) {
          _service.openForm(currentOption[0].key.toString(),
            currentLookup?.reference?.entityNameRef);
        }
      }}
      styles={lookupSelectedOptionStyles}
    />;

  // Determine if this field should be editable
  const isEditable = fieldName === 'nb_supplierreference' || value !== undefined;

  return <div>
    <TagPicker
      selectedItems={currentOption}
      componentRef={picker}
      onChange={onChange}
      onResolveSuggestions={filterSuggestedTags}
      resolveDelay={1000}
      onEmptyResolveSuggestions={initialValues}
      itemLimit={1}
      pickerSuggestionsProps={{ noResultsFoundText: 'No Results Found' }}
      styles={lookupFormatStyles(isRequired, isSecured ||
        (!isEditable && fieldName !== 'nb_supplierreference') || isDisabled || isOffline)}
      onRenderItem={ !isSecured && isEditable &&
        !isDisabled && !isOffline ? _onRenderItem : undefined}
      onBlur={() => {
        if (picker.current) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          picker.current.input.current._updateValue('');
          dispatch(setInvalidFields({ fieldId, isInvalid: isRequired,
            errorMessage: 'Required fields must be filled in' }));
        }
      }}
      disabled={isSecured ||
        (!isEditable && fieldName !== 'nb_supplierreference') || isDisabled || isOffline}
      inputProps={{
        onFocus: () => dispatch(setInvalidFields({ fieldId, isInvalid: false, errorMessage: '' })),
      }}
    />
    <FontIcon iconName={'AsteriskSolid'} className={asteriskClassStyle(isRequired)} />
    <ErrorIcon id={fieldId} isRequired={isRequired} />
  </div>;
});
