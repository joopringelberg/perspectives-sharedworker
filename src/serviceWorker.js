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
import { authenticate, resetAccount } from 'perspectives-core';

////////////////////////////////////////////////////////////////////////////////
//// INTERNAL CHANNEL
////////////////////////////////////////////////////////////////////////////////
import {InternalChannelPromise} from "perspectives-proxy";

////////////////////////////////////////////////////////////////////////////////
//// RECEIVE PORTS FROM CLIENTS
////////////////////////////////////////////////////////////////////////////////
const channels = {};
let channelIndex = 1;

self.onmessage = function(e) {
  if (e.data == "porttransfer")
  {
    channels[ channelIndex ] = e.ports[0];
    // Return the channelIndex.
    e.ports[0].postMessage( {serviceWorkerMessage: "channelId", channelId: 1000000 * channelIndex });
    channelIndex = channelIndex + 1;
    // start listening to the new channel, handle requests.
    e.ports[0].onmessage = handleClientRequest;
  }
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
        break;
      case "authenticate":
        authenticate(req.username)(req.password)(req.host)(req.port)
          (function(n) // (Int -> Effect Unit)
            {
              return function() //  This function is the result of the call to authenticate: the Effect.
              {
                // Find the channel.
                channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "authenticate", authenticationResult: n});
              };
            })(); // The core authenticate function results in an Effect, hence we apply it to return the (integer) result.
        break;
      case "resetAccount":
        resetAccount(req.username)(req.password)(req.host)(req.port)
          (function(success) // (Boolean -> Effect Unit)
            {
              return function() //  This function is the result of the call to resetAccount: the Effect.
              {
                channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "resetAccount", resetSuccesful: success });
              };
            })(); // The core authenticate function results in an Effect, hence we apply it to return the (boolean) result.

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
////////////////////////////////////////////////////////////////////////////////
//// HANDLE RESPONSES COMING IN FROM THE PERSPECTIVES DISTRIBUTED RUNTIME ON THE INTERNAL CHANNEL
////////////////////////////////////////////////////////////////////////////////
