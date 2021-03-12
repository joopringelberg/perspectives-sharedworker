// BEGIN LICENSE
// Perspectives Distributed Runtime
// Copyright (C) 2019 Joop Ringelberg (joopringelberg@perspect.it), Cor Baars
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
//
// Full text of this license can be found in the LICENSE file in the projects root.
// END LICENSE

import handleClientRequest from "./handleClientRequest.js";

////////////////////////////////////////////////////////////////////////////////
//// STORING PORTS SENT BY CLIENT PAGES
////////////////////////////////////////////////////////////////////////////////
const channels = {};
let channelIndex = 1;

////////////////////////////////////////////////////////////////////////////////
//// RECEIVE PORTS FROM CLIENTS WHEN RUN AS SHAREDWORKER
//// So this code is run in a shared worker.
////////////////////////////////////////////////////////////////////////////////
// onconnect is specific for SharedWorkers: https://developer.mozilla.org/en-US/docs/Web/API/SharedWorkerGlobalScope/connect_event
self.onconnect = function(e)
{
  // the new client (page) sends a port.
  channels[ channelIndex ] = e.ports[0];
  // Return the channelIndex.
  e.ports[0].postMessage( {serviceWorkerMessage: "channelId", channelId: 1000000 * channelIndex });
  channelIndex = channelIndex + 1;
  // start listening to the new channel, handle requests.
  e.ports[0].onmessage = request => handleClientRequest(channels, request);
};
