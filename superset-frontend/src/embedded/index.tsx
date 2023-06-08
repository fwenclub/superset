/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { makeApi, logging } from '@superset-ui/core';
import getBootstrapData from 'src/utils/getBootstrapData';
import { RootContextProviders } from 'src/views/RootContextProviders';
import { store, USER_LOADED } from 'src/views/store';
import ErrorBoundary from 'src/components/ErrorBoundary';
import Loading from 'src/components/Loading';
import ToastContainer from 'src/components/MessageToasts/ToastContainer';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';

const debugMode = process.env.WEBPACK_MODE === 'development';
const bootstrapData = getBootstrapData();

function log(...info: unknown[]) {
  if (debugMode) {
    logging.debug(`[superset]`, ...info);
  }
}

const LazyDashboardPage = lazy(
  () =>
    import(
      /* webpackChunkName: "DashboardPage" */ 'src/dashboard/containers/DashboardPage'
    ),
);

const EmbeddedRoute = () => (
  <Suspense fallback={<Loading />}>
    <RootContextProviders>
      <ErrorBoundary>
        <LazyDashboardPage idOrSlug={bootstrapData.embedded!.dashboard_id} />
      </ErrorBoundary>
      <ToastContainer position="top" />
    </RootContextProviders>
  </Suspense>
);

const EmbeddedApp = () => (
  <Router>
    {/* todo (embedded) remove this line after uuids are deployed */}
    <Route path="/dashboard/:idOrSlug/embedded/" component={EmbeddedRoute} />
    <Route path="/embedded/:uuid/" component={EmbeddedRoute} />
  </Router>
);

const appMountPoint = document.getElementById('app')!;

function showFailureMessage(message: string) {
  appMountPoint.innerHTML = message;
}

function start() {
  const getMeWithRole = makeApi<void, { result: UserWithPermissionsAndRoles }>({
    method: 'GET',
    endpoint: '/api/v1/me/roles/',
  });

  return getMeWithRole()
    .then(
      ({ result }) => {
        // fill in some missing bootstrap data
        // (because at pageload, we don't have any auth yet)
        // this allows the frontend's permissions checks to work.
        bootstrapData.user = result;
        store.dispatch({
          type: USER_LOADED,
          user: result,
        });
        ReactDOM.render(<EmbeddedApp />, appMountPoint);
      },
      err => {
        // something is most likely wrong with the guest token
        logging.error(err);
        showFailureMessage(
          'Something went wrong with embedded authentication. Check the dev console for details.',
        );
      },
    )
    .catch(err => {
    });
}
start();
log('embed page is ready to receive messages');
