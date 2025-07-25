import { createAsyncThunk, createSlice,
  isAnyOf, isPending, PayloadAction } from '@reduxjs/toolkit';
import { Row } from '../../mappers/dataSetMapper';
import { EntityPrivileges, IDataverseService } from '../../services/DataverseService';

export type RequirementLevel = {
  fieldName: string;
  isRequired: boolean;
}

export type CalculatedField = {
  fieldName: string;
  isCalculated: boolean;
}

export type Updates = {
  rowKey: string;
  columnName: string;
  newValue: any;
}

export type FieldSecurity = {
  fieldName: string;
  hasUpdateAccess: boolean;
  hasCreateAccess: boolean;
}

export type InactiveRecord = {
  recordId: string;
  isInactive: boolean;
}

export interface IDatasetState {
  rows: Row[],
  newRows: Row[],
  requirementLevels: RequirementLevel[],
  entityPrivileges: EntityPrivileges,
  calculatedFields: CalculatedField[],
  securedFields: FieldSecurity[],
  inactiveRecords: InactiveRecord[],
  isPending: boolean,
}

const initialState: IDatasetState = {
  rows: [],
  newRows: [],
  requirementLevels: [],
  entityPrivileges: <EntityPrivileges>{},
  calculatedFields: [],
  securedFields: [],
  inactiveRecords: [],
  isPending: true,
};

type DatasetPayload = {
  columnKeys: string[],
  _service: IDataverseService,
}

type RecordsPayload = {
  recordIds: string[],
  _service: IDataverseService,
}

export const setCalculatedFields = createAsyncThunk<CalculatedField[], DatasetPayload>(
  'dataset/setCalculatedFields',
  async payload => await Promise.all(payload.columnKeys.map(async columnKey => {
    const isCalculated = await payload._service.isCalculatedField(columnKey);
    return { fieldName: columnKey, isCalculated };
  })),
);

export const setRequirementLevels = createAsyncThunk<any[], DatasetPayload>(
  'dataset/setRequirementLevels',
  async payload => await Promise.all(payload.columnKeys.map(async columnKey => {
    const isRequired = await payload._service.getReqirementLevel(columnKey) !== 'None';
    return { fieldName: columnKey, isRequired };
  })),
);

export const setEntityPrivileges = createAsyncThunk<EntityPrivileges, IDataverseService>(
  'dataset/setEntityPrivileges',
  async _service => await _service.getSecurityPrivileges(),
);

export const setSecuredFields = createAsyncThunk<FieldSecurity[], DatasetPayload>(
  'dataset/setSecuredFields',
  async payload => await Promise.all(payload.columnKeys.map(async columnKey => {
    let hasUpdateAccess = true;
    let hasCreateAccess = true;

    const isFieldSecured = await payload._service.isFieldSecured(columnKey);
    if (!isFieldSecured) {
      return { fieldName: columnKey, hasUpdateAccess, hasCreateAccess };
    }

    const fieldPermissionRecord =
    await payload._service.getUserRelatedFieldServiceProfile(columnKey);

    if (!fieldPermissionRecord) {
      return { fieldName: columnKey, hasUpdateAccess, hasCreateAccess };
    }

    if (fieldPermissionRecord.entities.length > 0) {
      fieldPermissionRecord.entities.forEach(entity => {
        if (entity.canupdate === 0) {
          hasUpdateAccess = false;
        }

        if (entity.cancreate === 0) {
          hasCreateAccess = false;
        }
      });

      return { fieldName: columnKey, hasUpdateAccess, hasCreateAccess };
    }

    return { fieldName: columnKey, hasUpdateAccess: false, hasCreateAccess: false };
  })),
);

export const setInactiveRecords = createAsyncThunk<InactiveRecord[], RecordsPayload>(
  'dataset/setInactiveRecords',
  async payload => payload.recordIds.map(recordId => ({
    recordId,
    isInactive: true // Always disable all fields after save
  })),
);

export const datasetSlice = createSlice({
  name: 'dataset',
  initialState,
  reducers: {
    setRows: (state, action: PayloadAction<Row[]>) => {
      state.rows = action.payload;
    },

    updateRow: (state, action: PayloadAction<Updates>) => {
      const changedRow = state.rows.find(row => row.key === action.payload.rowKey);
      if (!changedRow) return; // row not found, do nothing

      console.log('[updateRow] rowKey:', action.payload.rowKey);
      console.log('[updateRow] columnName:', action.payload.columnName);
      console.log('[updateRow] columns before:', changedRow.columns.map(col => col.schemaName));

      const changedColumn =
        changedRow.columns.find(column => column.schemaName === action.payload.columnName);

      // If the column does not exist, add it (with minimal info)
      if (!changedColumn) {
        changedRow.columns.push({
          schemaName: action.payload.columnName,
          rawValue: action.payload.newValue || undefined,
          formattedValue: action.payload.newValue,
          lookup: action.payload.newValue,
          type: '', // Optionally set the correct type if known
        });
        console.log('[updateRow] columns after add:',
          changedRow.columns.map(col => col.schemaName));
        return;
      }

      changedColumn.rawValue = action.payload.newValue || undefined;
      changedColumn.formattedValue = action.payload.newValue;
      changedColumn.lookup = action.payload.newValue;
      console.log('[updateRow] columns after update:',
        changedRow.columns.map(col => col.schemaName));
    },

    addNewRow: (state, action: PayloadAction<Row>) => {
      state.rows.unshift(action.payload);
    },

    readdNewRowsAfterDelete: (state, action: PayloadAction<Row[]>) => {
      state.newRows = action.payload;
    },

    removeNewRows: state => {
      state.newRows = [];
    },

  },
  extraReducers: builder => {
    builder.addCase(setCalculatedFields.fulfilled, (state, action) => {
      state.calculatedFields = [...action.payload];
    });

    builder.addCase(setCalculatedFields.rejected, state => {
      state.calculatedFields = [];
    });

    builder.addCase(setRequirementLevels.fulfilled, (state, action) => {
      state.requirementLevels = [...action.payload];
    });

    builder.addCase(setRequirementLevels.rejected, state => {
      state.requirementLevels = [];
    });

    builder.addCase(setEntityPrivileges.fulfilled, (state, action) => {
      state.entityPrivileges = { ...action.payload };
    });

    builder.addCase(setEntityPrivileges.rejected, state => {
      state.entityPrivileges = <EntityPrivileges>{};
    });

    builder.addCase(setSecuredFields.fulfilled, (state, action) => {
      state.securedFields = [...action.payload];
    });

    builder.addCase(setSecuredFields.rejected, state => {
      state.securedFields = [];
    });

    builder.addCase(setInactiveRecords.fulfilled, (state, action) => {
      state.inactiveRecords = [...action.payload];
    });

    builder.addMatcher(isAnyOf(isPending(setSecuredFields, setRequirementLevels,
      setCalculatedFields, setEntityPrivileges, setInactiveRecords)), state => {
      state.isPending = true;
    });

    builder.addMatcher(isAnyOf(setSecuredFields.fulfilled, setSecuredFields.rejected), state => {
      state.isPending = false;
    });
  },
});

export const {
  setRows,
  updateRow,
  addNewRow,
  readdNewRowsAfterDelete,
  removeNewRows,
} = datasetSlice.actions;

export default datasetSlice.reducer;
