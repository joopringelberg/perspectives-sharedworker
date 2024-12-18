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
//// INTERNAL CHANNEL
////////////////////////////////////////////////////////////////////////////////
// `internalChannelPromise` is a promise that resolves to an InternalChannel that has been configured by the PDR
// with three Purescript functions that allow it (the channel) to function as a Purescript Emitter.
// It emits client requests to the core, so it connects the SharedWorker to the PDR.
// This function is called as a consequence of the evaluation of the function setupApi in the Main module of the PDR.

function corrId2ChannelId (corrId)
{
  return Math.floor(corrId / 1000000);
}

////////////////////////////////////////////////////////////////////////////////
//// HANDLE REQUESTS COMING IN THROUGH CHANNELS FROM CLIENTS
////////////////////////////////////////////////////////////////////////////////
let pdrResolver, pdrRejecter;
let pdrStartedIsResolved = false;
const pdrStarted = new Promise(function( resolver, rejecter)
  {
    pdrResolver = resolver;
    pdrRejecter = rejecter;
  }
  );

// These calls are implemented in accordance with the types of the functions in the core.
// The callbacks are declared as Effects, there, hence we treat them here that way.
// We could cheat and provide callbacks that do not return an Effect.
// NOTE that requests are received through the Channel Messaging API calls from clients. 
// `handleClientRequest` deals with them by using the InternalChannel's send function, 
// that has been connected by the PDR with the stream of requests the PerspectivesAPI handles.
// channels is an array of MessagePort objects. See: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort
export default function handleClientRequest( pdr, channels, request )
{
  const req = request.data;
  if (req.proxyRequest)
  {
    // The request can be handled right here in the SharedWorker itself.
    switch (req.proxyRequest)
    {
      case "pdrStarted":
        // This will always return an answer: it is not dependent on whether the PDR has actually been started.
        channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "pdrStarted", pdrStarted: pdrStartedIsResolved});
        break;
      case "isUserLoggedIn":
        //{proxyRequest: "isUserLoggedIn", channelId: proxy.channelId}
        pdr.internalChannelPromise.then( function ()
          {
            // We return true because the sharedworker is active.
            pdrStarted
              .then(() => channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "isUserLoggedIn", isUserLoggedIn: true}))
              .catch(() => channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "isUserLoggedIn", isUserLoggedIn: false}));
          });
        break;
      case "resetAccount":
        pdr.resetAccount( req.username) (req.pouchdbuser) (req.options)
          // eslint-disable-next-line no-unexpected-multiline
          (function(success) // (Boolean -> Effect Unit)
            {
              return function() //  This function is the result of the call to resetAccount: the Effect.
              {
                channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "resetAccount", resetSuccesful: success });
              };
            })(); // The core resetAccount function results in an Effect, hence we apply it to return the (boolean) result.
        break;
      case "reCreateInstances":
        pdr.reCreateInstances (req.pouchdbuser) (req.options) 
          // eslint-disable-next-line no-unexpected-multiline
          (function(success) // (Boolean -> Effect Unit)
            {
              return function() //  This function is the result of the call to reCreateInstances: the Effect.
              {
                channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "reCreateInstances", reCreateSuccesful: success });
              };
            })(); // The core reCreateInstances function results in an Effect, hence we apply it to return the (boolean) result.
        break;
      case "recompileLocalModels":
        pdr.recompileLocalModels(req.pouchdbuser) 
          // eslint-disable-next-line no-unexpected-multiline
          (function(success) // (Boolean -> Effect Unit)
            {
              return function() //  This function is the result of the call to recompileLocalModels: the Effect.
              {
                channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "recompileLocalModels", recompileSuccesful: success });
              };
            })(); // The core recompileLocalModels function results in an Effect, hence we apply it to return the (boolean) result.
        break;
      case "createAccount":
        pdr.createAccount( req.username) (req.pouchdbuser) (req.runtimeOptions) (req.identityDocument)
          // eslint-disable-next-line no-unexpected-multiline
          (function({success, reason}) // ({success :: Boolean, reason :: Nullable String} -> Effect Unit)
            {
              return function() //  This function is the result of the call to createAccount: the Effect.
              {
                channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "createAccount", createSuccesful: {success, reason} });
              };
            })(); // The core createAccount function results in an Effect, hence we apply it to return the (boolean) result.
        break;
      case "removeAccount":
        pdr.removeAccount( req.username) (req.pouchdbuser) 
          // eslint-disable-next-line no-unexpected-multiline
          (function(success) // (Boolean -> Effect Unit)
            {
              return function() //  This function is the result of the call to removeAccount: the Effect.
              {
                channels[corrId2ChannelId(req.channelId)].postMessage({serviceWorkerMessage: "removeAccount", removeSuccesful: success });
              };
            })(); // The core removeAccount function results in an Effect, hence we apply it to return the (boolean) result.
        break;
      case "runPDR":
        // runPDR :: UserName -> PouchdbUser RuntimeOptions -> Effect Unit
        try
          {
            pdr.runPDR( req.username) (req.pouchdbuser) (req.options)
              // eslint-disable-next-line no-unexpected-multiline
              (function(success) // (Boolean -> Effect Unit), the callback.
              {
                return function() // This function is the Effect that is returned.
                {
                  if (success)
                  {
                    pdrStartedIsResolved = true;
                    pdrResolver(true);
                  }
                  else
                  {
                    pdrRejecter(false);
                  }
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
        pdr.internalChannelPromise.then( ic => ic.close() );
        break;
      case "unsubscribe":
        pdr.internalChannelPromise.then( ic => ic.unsubscribe( req.request ) );
        break;
    }
  }
  else
  {
    // The request represents a call to the PDR.
    // The original client callback was saved in the SharedWorkerChannel (on the other side, i.e. the client side) and associated with the corrId.
    // Replace the callback with a function that passes on the response to the right channel.
    // The SharedWorkerChannel will apply the original client callback.
    req.reactStateSetter = function( result )
      {
        return function()
        {
          channels[corrId2ChannelId(result.corrId)].postMessage( result );
        };
      };
    // Now call the PDR.
    pdr.internalChannelPromise.then( ic => ic.send( req ) );
  }
}
