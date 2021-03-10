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

////////////////////////////////////////////////////////////////////////////////
//// PERSPECTIVES DISTRIBUTED RUNTIME
////////////////////////////////////////////////////////////////////////////////
import { resetAccount, runPDR, createAccount } from 'perspectives-core';

////////////////////////////////////////////////////////////////////////////////
//// INTERNAL CHANNEL
////////////////////////////////////////////////////////////////////////////////
import {InternalChannelPromise} from "perspectives-proxy";

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
  e.ports[0].onmessage = handleClientRequest;
};

////////////////////////////////////////////////////////////////////////////////
//// HANDLE REQUESTS COMING IN THROUGH CHANNELS FROM CLIENTS
////////////////////////////////////////////////////////////////////////////////
// These calls are implemented in accordance with the types of the functions in the core.
// The callbacks are declared as Effects, there, hence we treat them here that way.
// We could cheat and provide callbacks that do not return an Effect.
function handleClientRequest( request )
{
  const req = request.data;
  if (req.proxyRequest)
  {
    switch (req.proxyRequest)
    {
      case "isUserLoggedIn":
        //{proxyRequest: "isUserLoggedIn", channelId: proxy.channelId}
        InternalChannelPromise.then( function ()
          {
            channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "isUserLoggedIn", isUserLoggedIn: true});
          });
        break;
      case "resetAccount":
        resetAccount( req.username) (req.pouchdbuser) (req.publicrepo)
          (function(success) // (Boolean -> Effect Unit)
            {
              return function() //  This function is the result of the call to resetAccount: the Effect.
              {
                channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "resetAccount", resetSuccesful: success });
              };
            })(); // The core resetAccount function results in an Effect, hence we apply it to return the (boolean) result.
        break;
      case "createAccount":
        createAccount( req.username) (req.pouchdbuser) (req.publicrepo)
          (function(success) // (Boolean -> Effect Unit)
            {
              return function() //  This function is the result of the call to createAccount: the Effect.
              {
                channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "createAccount", createSuccesful: success });
              };
            })(); // The core createAccount function results in an Effect, hence we apply it to return the (boolean) result.
        break;
      case "runPDR":
        // runPDR :: UserName -> Password -> PouchdbUser -> Url -> Effect Unit
        try
          {
            runPDR( req.username) (req.pouchdbuser) (req.publicrepo)
              (function(success) // (Boolean -> Effect Unit), the callback.
              {
                return function() // This function is the Effect that is returned.
                {
                  channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "runPDR", startSuccesful: success });
                  return {};
                };
              })();
            break;
          }
          catch (e)
          {
            // Return the error message to the client.
            channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "runPDR", error: e });
          }
        break;
      case "close":
        InternalChannelPromise.then( ic => ic.close() );
        break;
      case "unsubscribe":
        InternalChannelPromise.then( ic => ic.unsubscribe( req.request ) );
        break;
    }
  }
  else
  {
    // The callback was saved in the ServiceWorkerChannel.
    // Replace the callback with a function that passes on the response to the right channel.
    // The ServiceWorkerChannel will apply the callback.
    req.reactStateSetter = function( result )
      {
        return function()
        {
          channels[corrId2ChannelId(result.corrId)].postMessage( result );
        };
      };
    InternalChannelPromise.then( ic => ic.send( req ) );
  }
}

function corrId2ChannelId (corrId)
{
  return Math.floor(corrId / 1000000);
}
