/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import * as utils from '../utils';
import { DataSourceTable } from './data_source_table';
import { mount, ReactWrapper } from 'enzyme';
import { RouteComponentProps } from 'react-router-dom';
import { wrapWithIntl } from 'test_utils/enzyme_helpers';
import { ScopedHistory } from 'opensearch-dashboards/public';
import { scopedHistoryMock } from '../../../../../core/public/mocks';
import { OpenSearchDashboardsContextProvider } from '../../../../opensearch_dashboards_react/public';
import { getMappedDataSources, mockManagementPlugin } from '../../mocks';

const deleteButtonIdentifier = '[data-test-subj="deleteDataSourceConnections"]';
const toastsIdentifier = 'EuiGlobalToastList';
const tableIdentifier = 'EuiInMemoryTable';
const confirmModalIndentifier = 'EuiConfirmModal';
const tableColumnHeaderIdentifier = 'EuiTableHeaderCell';
const tableColumnHeaderButtonIdentifier = 'EuiTableHeaderCell .euiTableHeaderButton';

describe('DataSourceTable', () => {
  const mockedContext = mockManagementPlugin.createDataSourceManagementContext();
  let component: ReactWrapper<any, Readonly<{}>, React.Component<{}, {}, any>>;
  const history = (scopedHistoryMock.create() as unknown) as ScopedHistory;

  describe('should get datasources failed', () => {
    beforeEach(async () => {
      spyOn(utils, 'getDataSources').and.returnValue(Promise.reject({}));
      await act(async () => {
        component = await mount(
          wrapWithIntl(
            <DataSourceTable
              history={history}
              location={({} as unknown) as RouteComponentProps['location']}
              match={({} as unknown) as RouteComponentProps['match']}
            />
          ),
          {
            wrappingComponent: OpenSearchDashboardsContextProvider,
            wrappingComponentProps: {
              services: mockedContext,
            },
          }
        );
      });
    });

    it('should show toast and remove toast normally', () => {
      expect(component).toMatchSnapshot();
      expect(utils.getDataSources).toHaveBeenCalled();
      component.update();
      // @ts-ignore
      expect(component.find(toastsIdentifier).props().toasts.length).toBe(1);

      act(() => {
        // @ts-ignore
        component.find(toastsIdentifier).first().prop('dismissToast')({
          id: 'dataSourcesManagement.dataSourceListing.fetchDataSourceFailMsg',
        });
      });
      component.update();
      // @ts-ignore
      expect(component.find(toastsIdentifier).props().toasts.length).toBe(0); // failure toast
    });
  });

  describe('should get datasources successful', () => {
    beforeEach(async () => {
      spyOn(utils, 'getDataSources').and.returnValue(Promise.resolve(getMappedDataSources));
      await act(async () => {
        component = await mount(
          wrapWithIntl(
            <DataSourceTable
              history={history}
              location={({} as unknown) as RouteComponentProps['location']}
              match={({} as unknown) as RouteComponentProps['match']}
            />
          ),
          {
            wrappingComponent: OpenSearchDashboardsContextProvider,
            wrappingComponentProps: {
              services: mockedContext,
            },
          }
        );
      });
    });

    it('should render normally', () => {
      expect(component).toMatchSnapshot();
      expect(utils.getDataSources).toHaveBeenCalled();
    });

    it('should sort datasources based on description', () => {
      expect(component.find(tableIdentifier).exists()).toBe(true);
      act(() => {
        component.find(tableColumnHeaderButtonIdentifier).last().simulate('click');
      });
      component.update();
      // @ts-ignore
      expect(component.find(tableColumnHeaderIdentifier).last().props().isSorted).toBe(true);
    });

    it('should enable delete button when select datasources', () => {
      expect(component.find(deleteButtonIdentifier).first().props().disabled).toBe(true);

      act(() => {
        // @ts-ignore
        component.find(tableIdentifier).props().selection.onSelectionChange(getMappedDataSources);
      });
      component.update();
      expect(component.find(deleteButtonIdentifier).first().props().disabled).toBe(false);
    });

    it('should detele confirm modal pop up and cancel button work normally', () => {
      act(() => {
        // @ts-ignore
        component.find(tableIdentifier).props().selection.onSelectionChange(getMappedDataSources);
      });
      component.update();
      component.find(deleteButtonIdentifier).first().simulate('click');
      // test if modal pop up when click the delete button
      expect(component.find(confirmModalIndentifier).exists()).toBe(true);

      act(() => {
        // @ts-ignore
        component.find(confirmModalIndentifier).first().props().onCancel();
      });
      component.update();
      expect(component.find(confirmModalIndentifier).exists()).toBe(false);
    });

    it('should detele confirm modal confirm button work normally', async () => {
      spyOn(utils, 'deleteMultipleDataSources').and.returnValue(Promise.resolve({}));

      act(() => {
        // @ts-ignore
        component.find(tableIdentifier).props().selection.onSelectionChange(getMappedDataSources);
      });
      component.update();
      component.find(deleteButtonIdentifier).first().simulate('click');
      expect(component.find(confirmModalIndentifier).exists()).toBe(true);

      await act(async () => {
        // @ts-ignore
        await component.find(confirmModalIndentifier).first().props().onConfirm();
      });
      component.update();
      expect(component.find(confirmModalIndentifier).exists()).toBe(false);
    });

    it('should show toast when delete datasources failed', async () => {
      spyOn(utils, 'deleteMultipleDataSources').and.returnValue(Promise.reject({}));
      act(() => {
        // @ts-ignore
        component.find(tableIdentifier).props().selection.onSelectionChange(getMappedDataSources);
      });

      component.update();
      component.find(deleteButtonIdentifier).first().simulate('click');
      expect(component.find(confirmModalIndentifier).exists()).toBe(true);

      await act(async () => {
        // @ts-ignore
        await component.find(confirmModalIndentifier).props().onConfirm();
      });
      component.update();
      expect(utils.deleteMultipleDataSources).toHaveBeenCalled();
      // @ts-ignore
      expect(component.find(toastsIdentifier).props().toasts.length).toBe(1);
      expect(component.find(confirmModalIndentifier).exists()).toBe(false);
    });
  });
});
