import { IInputs } from '../generated/ManifestTypes';
import { IComboBoxOption, IDropdownOption, ITag } from '@fluentui/react';
import { getFetchResponse } from '../utils/fetchUtils';
import { Relationship } from '../store/features/LookupSlice';
import { Record } from '../store/features/RecordSlice';
import { DropdownField } from '../store/features/DropdownSlice';
import { NumberFieldMetadata } from '../store/features/NumberSlice';
import { NEW_RECORD_ID_LENGTH_CHECK } from '../utils/commonUtils';

export type ParentMetadata = {
  entityId: string,
  entityRecordName: string,
  entityTypeName: string,
};

export type Entity = ComponentFramework.WebApi.Entity;

export type EntityPrivileges = {
  create: boolean,
  read: boolean,
  write: boolean,
  delete: boolean,
};

export type CurrencyData = {
  symbol: string,
  precision: number,
}

export interface ErrorDetails {
  code: number,
  errorCode: number,
  message: string,
  raw: string,
  title: string
  recordId?: string,
}

export interface IDataverseService {
  getEntityPluralName(entityName: string): Promise<string>;
  getCurrentUserName(): string;
  getParentMetadata(): ParentMetadata;
  setParentValue(): Promise<void>;
  openForm(id: string, entityName?: string): void;
  createNewRecord(data: {}): Promise<ComponentFramework.LookupValue | ErrorDetails>;
  retrieveAllRecords(entityName: string, options: string): Promise<Entity[]>;
  retrieveMultipleRecords(entityName: string, options: string): Promise<Entity[]>;
  getRecord(recordId: string): Promise<Entity>;
  deleteRecord(recordId: string): Promise<ComponentFramework.LookupValue | ErrorDetails>;
  openRecordDeleteDialog(): Promise<ComponentFramework.NavigationApi.ConfirmDialogResponse>;
  openErrorDialog(error: any): Promise<void>;
  getFieldSchemaName(): Promise<string>;
  parentFieldIsValid(record: Record, subgridParentFieldName: string | undefined): boolean;
  saveRecord(record: Record): Promise<ComponentFramework.LookupValue | ErrorDetails>;
  getRelationships(): Promise<Relationship[]>;
  getLookupOptions(entityName: string): Promise<ITag[]>;
  getDropdownOptions(fieldName: string, attributeType: string, isTwoOptions: boolean):
    Promise<DropdownField>;
  getNumberFieldMetadata(fieldName: string, attributeType: string, selection: string):
    Promise<NumberFieldMetadata>;
  getCurrency(recordId: string): Promise<CurrencyData>;
  getCurrencyById(recordId: string): Promise<CurrencyData>;
  getTimeZoneDefinitions(): Promise<IComboBoxOption[]>;
  getProvisionedLanguages(): Promise<IComboBoxOption[]>;
  getDateMetadata(fieldName: string): Promise<any>;
  getTextFieldMetadata(fieldName: string, type: string | undefined): Promise<number>;
  getTargetEntityType(): string;
  getContext(): ComponentFramework.Context<IInputs>;
  getAllocatedWidth(): number;
  getReqirementLevel(fieldName: string): Promise<any>;
  getSecurityPrivileges(): Promise<EntityPrivileges>;
  isStatusField(fieldName: string | undefined): boolean;
  isCalculatedField(fieldName: string | undefined): Promise<boolean>;
  getGlobalPrecision(): Promise<number>;
  getFirstDayOfWeek(): number;
  getWeekDayNamesShort(): string[];
  getMonthNamesShort(): string[];
  getMonthNamesLong(): string[];
  getUserRelatedFieldServiceProfile(columnKey: string):
  Promise<ComponentFramework.WebApi.RetrieveMultipleResponse | null>;
  isFieldSecured(columnName: string) : Promise<boolean>;
  isRecordEditable(recordId: string): Promise<boolean>;
  isOffline(): boolean;
}

export class DataverseService implements IDataverseService {
  private _context: ComponentFramework.Context<IInputs>;
  private _targetEntityType: string;
  private _clientUrl: string;
  private _parentValue: string | undefined;
  public _isOffline: boolean;

  constructor(context: ComponentFramework.Context<IInputs>) {
    this._context = context;
    this._targetEntityType = context.parameters.dataset.getTargetEntityType();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this._clientUrl = `${this._context.page.getClientUrl()}/api/data/v9.2/`;
    this._isOffline = this._context.client.isOffline();
  }

  public getCurrentUserName() {
    return this._context.userSettings.userName;
  }

  public getParentMetadata() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return <ParentMetadata> this._context.mode.contextInfo;
  }

  public async getEntityPluralName(entityName: string): Promise<string> {
    const metadata = await this._context.utils.getEntityMetadata(entityName);
    return metadata.EntitySetName;
  }

  public async getParentPluralName(): Promise<string | undefined> {
    const parentMetadata = this.getParentMetadata();
    const parentEntityPluralName = await this.getEntityPluralName(parentMetadata.entityTypeName);
    return parentMetadata.entityId
      ? `/${parentEntityPluralName}(${parentMetadata.entityId})`
      : undefined;
  }

  public async setParentValue() {
    this._parentValue = await this.getParentPluralName();
  }

  public openForm(id: string, entityName?: string) {
    const options = {
      entityId: id,
      entityName: entityName ?? this._targetEntityType,
      openInNewWindow: false,
    };
    this._context.navigation.openForm(options);
  }

  public async createNewRecord(data: {}): Promise<ComponentFramework.LookupValue | ErrorDetails> {
    return await this._context.webAPI.createRecord(this._targetEntityType, data);
  }

  public async retrieveAllRecords(entityName: string, options: string) {
    const entities = [];
    let result = await this._context.webAPI.retrieveMultipleRecords(entityName, options);
    entities.push(...result.entities);
    while (result.nextLink !== undefined) {
      options = result.nextLink.slice(result.nextLink.indexOf('?'));
      result = await this._context.webAPI.retrieveMultipleRecords(entityName, options);
      entities.push(...result.entities);
    }
    return entities;
  }

  public async retrieveMultipleRecords(entityName: string, options: string): Promise<Entity[]> {
    const result = await this._context.webAPI.retrieveMultipleRecords(entityName, options);
    return result.entities;
  }

  public async getRecord(recordId: string): Promise<Entity> {
    const result = await this._context.webAPI.retrieveRecord(this._targetEntityType, recordId);
    return result;
  }

  public async deleteRecord(recordId: string):
  Promise<ComponentFramework.LookupValue | ErrorDetails> {
    try {
      return await this._context.webAPI.deleteRecord(this._targetEntityType, recordId);
    }
    catch (error: any) {
      return <ErrorDetails>{ ...error, recordId };
    }
  }

  public async openRecordDeleteDialog():
  Promise<ComponentFramework.NavigationApi.ConfirmDialogResponse> {
    const entityMetadata = await this._context.utils.getEntityMetadata(this._targetEntityType);
    const strings = {
      text: `Do you want to delete selected ${entityMetadata._displayName}?
            You can't undo this action.`,
      title: 'Confirm Deletion',
    };
    const options = { height: 200, width: 450 };
    const response = await this._context.navigation.openConfirmDialog(strings, options);

    return response;
  }

  public openErrorDialog(error: any): Promise<void> {
    const errorMessage = error.code === 2147746581
      ? 'You are missing some privileges, please contact your administrator'
      : error.message;

    const errorDialogOptions: ComponentFramework.NavigationApi.ErrorDialogOptions = {
      errorCode: error.code,
      message: errorMessage,
      details: error.raw,
    };

    return this._context.navigation.openErrorDialog(errorDialogOptions);
  }

  public async getFieldSchemaName(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const logicalName = this._context.page.entityTypeName;
    const endpoint = `EntityDefinitions(LogicalName='${logicalName}')/OneToManyRelationships`;
    const options = `$filter=ReferencingEntity eq '${
      this._targetEntityType}'&$select=ReferencingEntityNavigationPropertyName`;
    const request = `${this._clientUrl}${endpoint}?${options}`;
    const data = await getFetchResponse(request);
    return data.value[0]?.ReferencingEntityNavigationPropertyName;
  }

  public parentFieldIsValid(record: Record, subgridParentFieldName: string | undefined) {
    return subgridParentFieldName !== undefined &&
    record.id.length < NEW_RECORD_ID_LENGTH_CHECK &&
    !record.data.some(recordData => recordData.fieldName === subgridParentFieldName);
  }

  public async saveRecord(record: Record):
  Promise<ComponentFramework.LookupValue | ErrorDetails> {
    const data = record.data.reduce((obj, recordData) =>
      Object.assign(obj,
        recordData.fieldType === 'Lookup.Simple'
          ? { [`${recordData.fieldName}@odata.bind`]: recordData.newValue }
          : { [recordData.fieldName]: recordData.newValue }), {});

    const subgridParentFieldName = await this.getFieldSchemaName();
    if (this.parentFieldIsValid(record, subgridParentFieldName) && this._parentValue) {
      Object.assign(data, { [`${subgridParentFieldName}@odata.bind`]: this._parentValue });
    }

    if (record.id.length < NEW_RECORD_ID_LENGTH_CHECK) {
      try {
        return await this.createNewRecord(data);
      }
      catch (error: any) {
        return <ErrorDetails>error;
      }
    }
    else {
      try {
        return await this._context.webAPI.updateRecord(this._targetEntityType, record.id, data);
      }
      catch (error: any) {
        return <ErrorDetails>{ ...error, recordId: record.id };
      }
    }
  }

  public async getRelationships(): Promise<Relationship[]> {
    const relationships = `ManyToManyRelationships,ManyToOneRelationships,OneToManyRelationships`;
    const request = `${this._clientUrl}EntityDefinitions(LogicalName='${
      this._targetEntityType}')?$expand=${relationships}`;
    const results = await getFetchResponse(request);

    return [
      ...results.OneToManyRelationships.map((relationship: any) => <Relationship>{
        fieldNameRef: relationship.ReferencingAttribute,
        entityNameRef: relationship.ReferencedEntity,
        entityNavigation: relationship.ReferencingEntityNavigationPropertyName,
      },
      ),
      ...results.ManyToOneRelationships.map((relationship: any) => <Relationship>{
        fieldNameRef: relationship.ReferencingAttribute,
        entityNameRef: relationship.ReferencedEntity,
        entityNavigation: relationship.ReferencingEntityNavigationPropertyName,
      },
      ),
      ...results.ManyToManyRelationships.map((relationship: any) => <Relationship>{
        fieldNameRef: relationship.ReferencingAttribute,
        entityNameRef: relationship.ReferencedEntity,
      },
      ),
    ];
  }

  public async getLookupOptions(entityName: string) {
    const metadata = await this._context.utils.getEntityMetadata(entityName);
    const entityNameFieldName = metadata.PrimaryNameAttribute;
    const entityIdFieldName = metadata.PrimaryIdAttribute;

    const fetchedOptions = await this.retrieveAllRecords(entityName,
      `?$select=${entityIdFieldName},${entityNameFieldName}`);

    const options: ITag[] = fetchedOptions.map(option => ({
      key: option[entityIdFieldName],
      name: option[entityNameFieldName] ?? '(No Name)',
    }));

    return options;
  }

  public async getDropdownOptions(fieldName: string, attributeType: string, isTwoOptions: boolean) {
    const request = `${this._clientUrl}EntityDefinitions(LogicalName='${
      this._targetEntityType}')/Attributes/Microsoft.Dynamics.CRM.${
      attributeType}?$select=LogicalName&$filter=LogicalName eq '${fieldName}'&$expand=OptionSet`;
    let options: IDropdownOption[] = [];
    const results = await getFetchResponse(request);
    if (!isTwoOptions) {
      options = results.value[0].OptionSet.Options.map((result: any) => ({
        key: result.Value.toString(),
        text: result.Label.UserLocalizedLabel.Label,
      }));
    }
    else {
      const trueKey = results.value[0].OptionSet.TrueOption.Value.toString();
      const trueText = results.value[0].OptionSet.TrueOption.Label.UserLocalizedLabel.Label;
      options.push({ key: trueKey, text: trueText });

      const falseKey = results.value[0].OptionSet.FalseOption.Value.toString();
      const falseText = results.value[0].OptionSet.FalseOption.Label.UserLocalizedLabel.Label;
      options.push({ key: falseKey, text: falseText });
    }
    return { fieldName, options };
  }

  public async getNumberFieldMetadata(fieldName: string, attributeType: string, selection: string) {
    const request = `${this._clientUrl}EntityDefinitions(LogicalName='${
      this._targetEntityType}')/Attributes/Microsoft.Dynamics.CRM.${attributeType}?$select=${
      selection}&$filter=LogicalName eq '${fieldName}'`;
    const results = await getFetchResponse(request);

    let precision = results.value[0]?.PrecisionSource ?? results.value[0]?.Precision ?? 0;

    switch (precision) {
      case 0:
        precision = results.value[0]?.Precision;
        break;
      case 1:
        precision = this._isOffline ? results.value[0]?.Precision : await this.getGlobalPrecision();
        break;
      default:
        precision;
    }

    return {
      fieldName,
      precision,
      minValue: results.value[0].MinValue,
      maxValue: results.value[0].MaxValue,
      isBaseCurrency: results.value[0].IsBaseCurrency,
      precisionNumber: results.value[0]?.Precision,
    };
  }

  public async getGlobalPrecision() : Promise<number> {
    const request = `${this._clientUrl}organizations?$select=pricingdecimalprecision`;
    const response = await getFetchResponse(request);
    return response?.value[0].pricingdecimalprecision;
  }

  public async getCurrency(recordId: string): Promise<CurrencyData> {
    const fetchedCurrency = await this._context.webAPI.retrieveRecord(
      this._targetEntityType,
      recordId,
      // eslint-disable-next-line max-len
      '?$select=_transactioncurrencyid_value&$expand=transactioncurrencyid($select=currencysymbol,currencyprecision)',
    );
    return {
      symbol: fetchedCurrency.transactioncurrencyid?.currencysymbol ??
      this._context.userSettings.numberFormattingInfo.currencySymbol,
      precision: fetchedCurrency.transactioncurrencyid?.currencyprecision ??
      this._context.userSettings.numberFormattingInfo.currencyDecimalDigits };
  }

  public async getCurrencyById(recordId: string): Promise<CurrencyData> {
    let fetchedCurrency = undefined;
    if (!this._isOffline) {
      fetchedCurrency = await this._context.webAPI.retrieveRecord(
        'transactioncurrency',
        recordId,
        '?$select=currencysymbol,currencyprecision',
      );
    }

    return {
      symbol: fetchedCurrency?.currencysymbol ??
      this._context.userSettings.numberFormattingInfo.currencySymbol,
      precision: fetchedCurrency?.currencyprecision ??
      this._context.userSettings.numberFormattingInfo.currencyDecimalDigits };
  }

  public async getTimeZoneDefinitions() {
    const request = `${this._clientUrl}timezonedefinitions`;
    const results = await getFetchResponse(request);

    return results.value.sort((a: any, b: any) => b.bias - a.bias)
      .map((timezone: any) => <IComboBoxOption>{
        key: timezone.timezonecode.toString(),
        text: timezone.userinterfacename,
      });
  }

  public async getProvisionedLanguages() {
    const request = `${this._clientUrl}RetrieveProvisionedLanguages`;
    const results = await getFetchResponse(request);

    return results.RetrieveProvisionedLanguages.map((language: any) => <IComboBoxOption>{
      key: language.toString(),
      text: this._context.formatting.formatLanguage(language),
    });
  }

  public async getDateMetadata(fieldName: string) {
    const filter = `$filter=LogicalName eq '${fieldName}'`;
    const request = `${this._clientUrl}EntityDefinitions(LogicalName='${this._targetEntityType
    }')/Attributes/Microsoft.Dynamics.CRM.DateTimeAttributeMetadata?${filter}`;
    const results = await getFetchResponse(request);

    return results.value[0].DateTimeBehavior.Value;
  }

  public async getTextFieldMetadata(fieldName: string, type: string | undefined) {
    const filter = `$filter=LogicalName eq '${fieldName}'`;
    const attributeType = `${type === 'Multiple'
      ? 'MemoAttributeMetadata' : 'StringAttributeMetadata'}`;
    const request = `${this._clientUrl}EntityDefinitions(LogicalName='${this._targetEntityType
    }')/Attributes/Microsoft.Dynamics.CRM.${attributeType}?${filter}`;
    const results = await getFetchResponse(request);

    return results.value[0]?.MaxLength;
  }

  public getTargetEntityType() {
    return this._targetEntityType;
  }

  public getContext() {
    return this._context;
  }

  public getAllocatedWidth() {
    return this._context.mode.allocatedWidth;
  }

  public async getReqirementLevel(fieldName: string) {
    const request = `${this._clientUrl}EntityDefinitions(LogicalName='${
      this._targetEntityType}')/Attributes(LogicalName='${fieldName}')?$select=RequiredLevel`;
    const results = await getFetchResponse(request);

    return results.RequiredLevel.Value;
  }

  public async getSecurityPrivileges() {
    const createPriv = this._context.utils.hasEntityPrivilege(this._targetEntityType, 1, 0);
    const readPriv = this._context.utils.hasEntityPrivilege(this._targetEntityType, 2, 0);
    const writePriv = this._context.utils.hasEntityPrivilege(this._targetEntityType, 3, 0);
    const deletePriv = this._context.utils.hasEntityPrivilege(this._targetEntityType, 4, 0);
    // doesnt look at the level (org vs user)
    return <EntityPrivileges>{
      create: createPriv,
      read: readPriv,
      write: writePriv,
      delete: deletePriv,
    };
  }

  public async isCalculatedField(fieldName: string | undefined) {
    const request = `${this._clientUrl}EntityDefinitions(LogicalName='${
      this._targetEntityType}')/Attributes(LogicalName='${fieldName}')?$select=IsValidForCreate`;
    const results = await getFetchResponse(request);

    return !results.IsValidForCreate;
  }

  public isStatusField(fieldName: string | undefined) {
    return fieldName === 'statuscode' || fieldName === 'statecode';
  }

  public getFirstDayOfWeek() {
    return this._context.userSettings.dateFormattingInfo.firstDayOfWeek;
  }

  public getWeekDayNamesShort() {
    return this._context.userSettings.dateFormattingInfo.shortestDayNames;
  }

  public getMonthNamesShort() {
    return this._context.userSettings.dateFormattingInfo.abbreviatedMonthNames;
  }

  public getMonthNamesLong() {
    return this._context.userSettings.dateFormattingInfo.monthNames;
  }

  public async getUserRelatedFieldServiceProfile(columnName: string) :
  Promise<ComponentFramework.WebApi.RetrieveMultipleResponse | null> {
    try {
      let fetchXml = `?fetchXml=
      <fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="true">
      <entity name="fieldpermission">
        <all-attributes/>
        <filter type="and">
          <condition attribute="attributelogicalname" operator="eq" value="${columnName}" />
        </filter>
          <link-entity name="fieldsecurityprofile" from="fieldsecurityprofileid"
            to="fieldsecurityprofileid" intersect="true">
            <link-entity name="systemuserprofiles" from="fieldsecurityprofileid"
              to="fieldsecurityprofileid" visible="false" intersect="true">
              <link-entity name="systemuser" from="systemuserid" to="systemuserid" alias="ae">
                <filter type="and">
                  <condition attribute="systemuserid" operator="eq-userid" />
                </filter>
              </link-entity>
            </link-entity>
          </link-entity>
      </entity>
      </fetch>`;

      let response =
      await this._context.webAPI.retrieveMultipleRecords('fieldpermission', fetchXml);

      if (response.entities.length === 0) {
        fetchXml = `?fetchXml=
        <fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="true">
        <entity name="fieldpermission">
          <all-attributes/>
          <filter type="and">
            <condition attribute="attributelogicalname" operator="eq" value="${columnName}" />
          </filter>
            <link-entity name="fieldsecurityprofile" from="fieldsecurityprofileid"
              to="fieldsecurityprofileid" intersect="true">
              <link-entity name="teamprofiles" from="fieldsecurityprofileid" 
                to="fieldsecurityprofileid" visible="false" intersect="true">
                <link-entity name="team" from="teamid" to="teamid" alias="af">
                  <filter type="and">
                    <condition attribute="teamid" operator="not-null" />
                  </filter>
                  <link-entity name="teammembership" from="teamid" 
                    to="teamid" visible="false" intersect="true">
                    <link-entity name="systemuser" from="systemuserid" to="systemuserid" alias="ag">
                      <filter type="and">
                        <condition attribute="systemuserid" operator="eq-userid" />
                      </filter>
                    </link-entity>
                  </link-entity>
                </link-entity>
              </link-entity>
            </link-entity>
        </entity>
        </fetch>`;

        response = await this._context.webAPI.retrieveMultipleRecords('fieldpermission', fetchXml);
      }
      return response;
    }
    catch (error: any) {
      return null;
    }
  }

  public async isFieldSecured(columnName: string) :
  Promise<boolean> {
    const request = `${this._clientUrl}EntityDefinitions(LogicalName='${
      // eslint-disable-next-line max-len
      this._targetEntityType}')/Attributes?$select=IsSecured&$filter=LogicalName eq '${columnName}'`;
    const result = await getFetchResponse(request);
    return result.value[0].IsSecured;
  }

  public async isRecordEditable(recordId: string) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this._context.parameters.dataset.records[recordId].isEditable();
  }

  public isOffline(): boolean {
    return this._isOffline;
  }

}
