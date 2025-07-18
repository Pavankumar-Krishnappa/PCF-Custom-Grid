import { AnyAction, ThunkMiddleware } from '@reduxjs/toolkit';
import { EnhancedStore } from '@reduxjs/toolkit/dist/configureStore';
import { CustomGrid } from '..';
import { IDatasetState } from '../store/features/DatasetSlice';
import { IDateState } from '../store/features/DateSlice';
import { IDropdownState } from '../store/features/DropdownSlice';
import { ILoadingState } from '../store/features/LoadingSlice';
import { ILookupState } from '../store/features/LookupSlice';
import { INumberState } from '../store/features/NumberSlice';
import { IRecordState } from '../store/features/RecordSlice';
import { IWholeFormatState } from '../store/features/WholeFormatSlice';
import { IErrorState } from '../store/features/ErrorSlice';
import { ITextState } from '../store/features/TextSlice';

export interface StoreState {
  dataset: IDatasetState;
  lookup: ILookupState;
  number: INumberState;
  dropdown: IDropdownState;
  loading: ILoadingState;
  record: IRecordState;
  wholeFormat: IWholeFormatState;
  date: IDateState;
  text: ITextState;
  error: IErrorState;
}

export type Store = EnhancedStore<
StoreState,
AnyAction,
[ThunkMiddleware<StoreState, AnyAction, undefined>]>;

const table = new CustomGrid();

export type RootState = ReturnType<typeof table._store.getState>;
export type AppDispatch = typeof table._store.dispatch;

export type AsyncThunkConfig = {
  state: RootState,
};
