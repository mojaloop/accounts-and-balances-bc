/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/
"use strict";
/*

import {ServerErrorResponse} from "@grpc/grpc-js/build/src/index";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {ServerUnaryCall, sendUnaryData, status} from "@grpc/grpc-js";
import {
    Empty,
    GrpcAccount,
    GrpcAccountArray,
    GrpcAccountsAndBalancesHandlers,
    GrpcCancelReservationRequest, GrpcCreateAccount,
    GrpcCreateAccountArray,
    GrpcCreateJournalEntry,
    GrpcCreateJournalEntryArray, GrpcHighLevelRequest, GrpcHighLevelRequestArray, GrpcHighLevelResponseArray,
    GrpcId,
    GrpcIdArray,
    GrpcJournalEntry,
    GrpcJournalEntryArray,
} from "@mojaloop/accounts-and-balances-bc-grpc-client-lib";
import {UnauthorizedError, CallSecurityContext} from "@mojaloop/security-bc-public-types-lib";
import {TokenHelper} from "@mojaloop/security-bc-client-lib";
import {
    AccountNotFoundError,
    AccountsAndBalancesAccount,
    AccountsAndBalancesAccountState,
    AccountsAndBalancesAccountType,
    AccountsAndBalancesError,
    AccountsAndBalancesJournalEntry,
    AccountsBalancesHighLevelRequestTypes,
    IAccountsBalancesHighLevelRequest,
    IAccountsBalancesHighLevelResponse,
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {ForbiddenError} from "@mojaloop/security-bc-public-types-lib/dist/index";
import {randomUUID} from "crypto";
import {AccountsAndBalancesAggregate} from "../../domain/aggregate";
import {IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {ServerDuplexStream} from "@grpc/grpc-js/src/server-call";



const UNKNOWN_ERROR_MESSAGE ="unknown error";

const BATCH_SIZE = 200;
const QUEUE_PROCESS_MIN_DELAY_MS = 50;
const INTERVAL_MS = 25;

declare class QueueItem{
    id:string;
    requests: GrpcHighLevelRequest[];
    secCtx: CallSecurityContext;
    callback: (error: Error|null, highLevelResponses?: IAccountsBalancesHighLevelResponse[])=>void;
    requestIds?: string[];
    responses?: IAccountsBalancesHighLevelResponse[];
}

export class GrpcHandlers {
	// Properties received through the constructor.
	private readonly _logger: ILogger;
	private readonly _aggregate: AccountsAndBalancesAggregate;
	private readonly _tokenHelper: TokenHelper;
    private readonly _histo:IHistogram;

    private _processing = false;
    private _lastProcessedTimestamp = 0;

    private _queue:QueueItem[] = [];

    constructor(
		logger: ILogger,
		tokenHelper: TokenHelper,
        metrics:IMetrics,
		aggregate: AccountsAndBalancesAggregate
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._tokenHelper = tokenHelper;
		this._aggregate = aggregate;

        this._histo = metrics.getHistogram("GrpcHandler", "GRPC requests handled by the Accounts and Balances CoA GRPC Handler", ["callName", "success"]);

	}
/!*

	getHandlers(): ControlPlaneServiceHandlers {
        return {
            // @ts-ignore
            //ClientStream: this._handleClientStream_TESTS.bind(this)
            "ClientStream": this._handleClientStream.bind(this)
		};
	}



    private _handleClientStream(call:ServerDuplexStream<ClientRequest__Output, ControlPlaneResponse>):void{
        console.log(`Got new stream from peer: ${call.getPeer()} and path: ${call.getPath()}`);

        call.on("data", (request:ClientRequest) => {
            // what did we get?
            if (request.initialRequest){
                console.log(request);
                const resp:ControlPlaneResponse = {
                    initialResponse: {
                        ledgerServiceType: "BuiltinGrpc",
                        serverList: { servers: [ { address: randomUUID(), port: 123 } ] }
                    }
                };

                call.write(resp);

            }else {
                console.log(new Error("invalid client request"));
            }
        });

        call.on("end", () => {

        });
        call.on("error", (error) => {
            console.log(`on error: ${JSON.stringify(error)}`)
        })
        call.on("finish", () => {
            console.log("on finish")
        })
        call.on("cancelled", () => {
            console.log("on cancelled")
        })
    }
*!/

/!*    private _handleClientStream_TESTS(call:ServerDuplexStream<ClientRequest, ControlPlaneResponse>):void{
        console.log(`Got new stream from peer: ${call.getPeer()} and path: ${call.getPath()}`);

        const end = ()=>{
            if (timeout.hasRef())
                clearTimeout(timeout);
            if (interval.hasRef())
                clearInterval(interval);

            //call.end();
        }

        const timeout = setTimeout(()=>{
            console.log("Ending this call...");
            // this will end the stream

            call.emit("error", {
                code: status.UNAUTHENTICATED,
                message: "bad token, sorry!"
            });
            setImmediate(()=>{
                console.log("calling close");
                end();
            })
            //call.end();
        }, 8_000);

        const interval = setInterval(()=>{
            const resp:ControlPlaneResponse = {
                newServerList: {
                    servers: [ { address: randomUUID(), port: 123 } ]
                }
            }
            call.write(resp);
            console.log("Sent new server list");
        }, 2000);

        call.on("data", (request:ClientRequest) => {
            // what did we get?
            if (request.initialRequest){

                console.log(request);
                const resp:ControlPlaneResponse = {
                    initialResponse: {
                        ledgerServiceType: "BuiltinGrpc",
                        serverList: { servers: [ { address: randomUUID(), port: 123 } ] }
                    }
                };

                call.write(resp);

            }else {
                console.log(new Error("invalid client request"));
            }
        });

        call.on("end", () => {
            end();
        });
        call.on("error", (error) => {
            console.log(`on error: ${JSON.stringify(error)}`)
        })
        call.on("finish", () => {
            console.log("on finish")
        })
        call.on("cancelled", () => {
            console.log("on cancelled")
        })
    }*!/

	/!**
	 * This will return the secCtx if successful,
	 * if not will call the callback with the correct err and return null
	 * @param call ServerUnaryCall
	 * @param callback sendUnaryData
	 * @private
	 *!/
	private async _getSecCtxFromCall(call: ServerUnaryCall<any, any>, callback: sendUnaryData<any>): Promise<CallSecurityContext | null> {
        const timerEndFn = this._histo.startTimer({callName: "_getSecCtxFromCall"});

        const returnUnauthorized = (msg: string) => {
            timerEndFn({success: "false"});
			callback(this._handleAggregateError(new UnauthorizedError(msg)));
			return null;
		};

		const callTokenMeta = call.metadata.get("TOKEN");
		if (!callTokenMeta) return returnUnauthorized("Could not get token from call metadata");

		const bearerToken = callTokenMeta[0] as string;
		if (!bearerToken) return returnUnauthorized("Could not get token from call metadata array (metadata key exists)");

        const callSecCtx:  CallSecurityContext | null = await this._tokenHelper.getCallSecurityContextFromAccessToken(bearerToken);

        if(!callSecCtx){
            return returnUnauthorized("Unable to verify or decodeToken token");
        }

        timerEndFn({success: "true"});
        return callSecCtx;
	}

    /!*
    private async _processQueue(){
        if(this._processing || this._queue.length == 0) return;

        const msSinceLast = Date.now() - this._lastProcessedTimestamp;
        let requestCount = 0;
        this._queue.forEach(value => requestCount+=value.requests.length);

        if(this._queue.length && (requestCount > BATCH_SIZE || msSinceLast > QUEUE_PROCESS_MIN_DELAY_MS)) {
            const queueCopy = this._queue.slice(0);
            this._processing = true;
            this._logger.isDebugEnabled() && this._logger.debug(`\nProcessing queue - length is: ${queueCopy.length} - msSinceLast: ${msSinceLast}`);

            const highLevelRequests: IAccountsBalancesHighLevelRequest[] = [];

            // group all batches in one request array
            for(const item of queueCopy){
                item.requestIds = [];
                item.responses = [];

                item.requests.forEach(req => {
                    // this will throw if any required field is missing - can safely do non-null assertion bellow
                    this._validateHighLevelRequest(req);

                    highLevelRequests.push({
                        requestType: req.requestType!,
                        requestId: req.requestId!,
                        hubJokeAccountId: req.hubJokeAccountId!,
                        payerPositionAccountId: req.payerPositionAccountId!,
                        transferId: req.transferId!,
                        transferAmount: req.transferAmount!,
                        currencyCode: req.currencyCode!,
                        payerLiquidityAccountId: req.payerLiquidityAccountId || null,
                        payeePositionAccountId: req.payeePositionAccountId || null,
                        payerNetDebitCap: req.payerNetDebitCap || null
                    });

                    item.requestIds!.push(req.requestId!);
                });
            }
            if(!highLevelRequests){
                this._lastProcessedTimestamp = Date.now();
                this._processing = false;
                return;
            }

            try {
                const highLevelResponses: IAccountsBalancesHighLevelResponse[] =
                    await this._aggregate.processHighLevelBatch(highLevelRequests);

                // re-assemble the batches
                for(const resp of highLevelResponses){
                    const item = queueCopy.find(item => item.requestIds?.includes(resp.requestId));
                    if(!item)
                        throw new Error("item not found in _processQueue after responses received");

                    if(!item.responses) item.responses = [];
                    item.responses.push(resp);
                }

                for(const item of queueCopy){
                    item.callback(null, item.responses);
                    const index = this._queue.findIndex(value => value.id === item.id);
                    if(index>-1) this._queue.splice(index,1);
                }
            } catch (error) {
                console.error(error);
                for(const item of queueCopy){
                    item.callback(this._handleAggregateError(error));
                    const index = this._queue.findIndex(value => value.id === item.id);
                    if(index>-1) this._queue.splice(index,1);
                }
            }

            this._logger.isDebugEnabled() && this._logger.debug("Processing queue - complete\n");

            this._lastProcessedTimestamp = Date.now();
            this._processing = false;
        }
    }

    private async _processHighLevelBatch(
        call: ServerUnaryCall<GrpcHighLevelRequestArray, GrpcHighLevelResponseArray>,
        callback: sendUnaryData<GrpcHighLevelResponseArray>
    ):Promise<void>{
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return; // callback was called by _getSecCtxFromCall()

        const timerEndFn = this._histo.startTimer({callName: "processHighLevelBatch"});

        const grpcReq: GrpcHighLevelRequestArray = call.request;
        if(!grpcReq.requestArray) throw new AccountsAndBalancesError("Invalid requestArray in GrpcHighLevelRequest request");



        // TODO remove console.log()
        this._logger.isDebugEnabled() && this._logger.debug(`GrpcHandlers _processHighLevelBatch() start with batch of: ${grpcReq.requestArray.length} - peer: ${call.getPeer()}`);
        const startTime = Date.now();

        const queueItemCallback = (error: Error|null, highLevelResponses?: IAccountsBalancesHighLevelResponse[])=>{
            if(error){
                timerEndFn({success: "false"});
                return callback(error, null);
            }

            if(!highLevelResponses?.length)
                highLevelResponses = [];

            // map response
            const grpcResponse:GrpcHighLevelResponseArray ={
                responseArray: highLevelResponses.map(response => {
                    return {
                        requestType: response.requestType,
                        requestId: response.requestId,
                        success: response.success,
                        errorMessage: response.errorMessage || undefined
                    };
                })
            };

            timerEndFn({success: "true"});

            this._logger.isDebugEnabled() && this._logger.debug(`GrpcHandlers _processHighLevelBatch() completed with batch of: \t${grpcReq.requestArray!.length} - peer: ${call.getPeer()}`);
            this._logger.isDebugEnabled() && this._logger.debug(`took: ${Date.now()-startTime}`);
            this._logger.isDebugEnabled() && this._logger.debug("\n\n");

            return callback(null, grpcResponse);
        };



        this._queue.push({
            id: randomUUID(),
            secCtx: secCtx,
            requests: grpcReq.requestArray,
            callback: queueItemCallback
        });
    }


    private _validateHighLevelRequest(req:GrpcHighLevelRequest):void{
        // common errors
        if(!req.hubJokeAccountId){
            throw new AccountsAndBalancesError("Invalid hubJokeAccountId on GrpcHighLevelRequest request");
        }
        if(!req.payerPositionAccountId){
            throw new AccountsAndBalancesError("Invalid payerPositionAccountId on GrpcHighLevelRequest request");
        }
        if (!req.transferAmount) {
            throw new AccountNotFoundError("Invalid transferAmount on GrpcHighLevelRequest request");
        }
        if (!req.currencyCode) {
            throw new AccountNotFoundError("Invalid currencyCode on GrpcHighLevelRequest request");
        }
        if (!req.transferId) {
            throw new AccountsAndBalancesError("Invalid transferId on GrpcHighLevelRequest request");
        }

        if(req.requestType === AccountsBalancesHighLevelRequestTypes.checkLiquidAndReserve){
            if(!req.payerLiquidityAccountId){
                throw new AccountsAndBalancesError("Invalid payerLiquidityAccountId on GrpcHighLevelRequest request");
            }
            if (!req.payerNetDebitCap) {
                throw new AccountsAndBalancesError("Invalid payerNetDebitCap on GrpcHighLevelRequest request");
            }
        }else if(req.requestType === AccountsBalancesHighLevelRequestTypes.cancelReservationAndCommit){
            if (!req.payeePositionAccountId) {
                throw new AccountNotFoundError("Invalid accounts on CancelReservationAndCommit request");
            }
        }else if(req.requestType === AccountsBalancesHighLevelRequestTypes.cancelReservation){
            if (!req.payeePositionAccountId) {
                throw new AccountNotFoundError("Invalid accounts on CancelReservationAndCommit request");
            }
        }else{
            throw new Error("Invalid GrpcHighLevelRequest.requestType");
        }
    }
*!/

/!*
	private async _checkLiquidAndReserve(
		call: ServerUnaryCall<GrpcCheckLiquidAndReserveRequest, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void>{
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

        const timerEndFn = this._histo.startTimer({callName: "_checkLiquidAndReserve"});
		const req: GrpcCheckLiquidAndReserveRequest = call.request;

		if(!req.hubJokeAccountId || !req.payerPositionAccountId || !req.payerLiquidityAccountId){
            timerEndFn({success: "false"});
			throw new AccountsAndBalancesError("Invalid accounts on CheckLiquidAndReserve request");
		}
		if(!req.transferAmount){
            timerEndFn({success: "false"});
			throw new AccountsAndBalancesError("Invalid transferAmount on CheckLiquidAndReserve request");
		}
		if (!req.currencyCode) {
            timerEndFn({success: "false"});
			throw new AccountsAndBalancesError("Invalid currencyCode on CheckLiquidAndReserve request");
		}
		if (!req.payerNetDebitCap) {
            timerEndFn({success: "false"});
			throw new AccountsAndBalancesError("Invalid payerNetDebitCap on CheckLiquidAndReserve request");
		}
		if (!req.transferId) {
            timerEndFn({success: "false"});
			throw new AccountsAndBalancesError("Invalid transferId on CheckLiquidAndReserve request");
		}

		try {
			await this._aggregate.checkLiquidAndReserve(
				secCtx,
				req.payerPositionAccountId, req.payerLiquidityAccountId, req.hubJokeAccountId,
				req.transferAmount, req.currencyCode, req.payerNetDebitCap, req.transferId
				);

            timerEndFn({success: "true"});
			return callback(null, {});
		} catch (error: unknown) {
            timerEndFn({success: "false"});
			return callback(this._handleAggregateError(error));
		}

	}

	private async _cancelReservationAndCommit(
		call: ServerUnaryCall<GrpcCancelReservationAndCommitRequest, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

        const timerEndFn = this._histo.startTimer({callName: "_cancelReservationAndCommit"});
		const req: GrpcCancelReservationAndCommitRequest = call.request;

		if (!req.hubJokeAccountId || !req.payerPositionAccountId || !req.payeePositionAccountId) {
            timerEndFn({success: "false"});
			throw new AccountNotFoundError("Invalid accounts on CancelReservationAndCommit request");
		}
		if (!req.transferAmount) {
            timerEndFn({success: "false"});
			throw new AccountNotFoundError("Invalid transferAmount on CancelReservationAndCommit request");
		}
		if (!req.currencyCode) {
            timerEndFn({success: "false"});
            throw new AccountNotFoundError("Invalid currencyCode on CancelReservationAndCommit request");
		}
		if (!req.transferId) {
            timerEndFn({success: "false"});
			throw new AccountsAndBalancesError("Invalid transferId on CheckLiquidAndReserve request");
		}

		try {
			await this._aggregate.cancelReservationAndCommit(
				secCtx, req.payerPositionAccountId, req.payeePositionAccountId, req.hubJokeAccountId,
				req.transferAmount, req.currencyCode, req.transferId
			);
            timerEndFn({success: "true"});
			return callback(null, {});
		} catch (error: unknown) {
            timerEndFn({success: "false"});
			return callback(this._handleAggregateError(error));
		}

	}

	private async _cancelReservation(
		call: ServerUnaryCall<GrpcCancelReservationRequest, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

		const req: GrpcCancelReservationAndCommitRequest = call.request;

		if (!req.hubJokeAccountId || !req.payerPositionAccountId || !req.payeePositionAccountId) {
			throw new AccountNotFoundError("Invalid accounts on CancelReservationAndCommit request");
		}
		if (!req.transferAmount) {
			throw new AccountNotFoundError("Invalid transferAmount on CancelReservationAndCommit request");
		}
		if (!req.currencyCode) {
			throw new AccountNotFoundError("Invalid currencyCode on CancelReservationAndCommit request");
		}
		if (!req.transferId) {
			throw new AccountsAndBalancesError("Invalid transferId on CheckLiquidAndReserve request");
		}

		try {
			await this._aggregate.cancelReservation(
				secCtx, req.payerPositionAccountId, req.hubJokeAccountId,
				req.transferAmount, req.currencyCode, req.transferId
			);
			return callback(null, {});
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

	}
*!/

	private async _createAccounts(
		call: ServerUnaryCall<GrpcCreateAccountArray, GrpcIdArray>,
		callback: sendUnaryData<GrpcIdArray>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

		const createRequests: GrpcCreateAccount[] = call.request.accountsToCreate || [];

		const accounts: {
			requestedId: string, ownerId: string, accountType: AccountsAndBalancesAccountType, currencyCode: string
		}[] = [];

		for(const item of createRequests) {
			// note: we can force values here because the aggregate will control and throw the correct error
			accounts.push({
				requestedId: item.requestedId!,
				ownerId: item.ownerId!,
				accountType: item.type as AccountsAndBalancesAccountType,
				currencyCode: item.currencyCode!
			});
		}

		let accountIds: string[];
		try {
			accountIds = await this._aggregate.createAccounts(secCtx, accounts);
		} catch (error: any) {
			return callback(this._handleAggregateError(error));
		}

		const grpcAccountIds: GrpcId[] = accountIds.map((accountId) => {
			return {grpcId: accountId};
		});
		callback(null, {grpcIdArray: grpcAccountIds});
	}

	private async _createJournalEntries(
		call: ServerUnaryCall<GrpcCreateJournalEntryArray, GrpcIdArray>,
		callback: sendUnaryData<GrpcIdArray>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

		const reqEntries: GrpcCreateJournalEntry[] = call.request.entriesToCreate || [];

		const now = Date.now();

		const journalEntries: {
			requestedId: string, amountStr: string, currencyCode: string,
			creditedAccountId: string, debitedAccountId: string, timestamp: number, ownerId: string, pending: boolean
		}[] = reqEntries.map((item) => {
			// note: we can force values here because the aggregate will control and throw the correct error
			return {
				requestedId: item.requestedId || randomUUID(),
				amountStr: item.amount!,
				currencyCode: item.currencyCode!,
				creditedAccountId: item.creditedAccountId!,
				debitedAccountId: item.debitedAccountId!,
				ownerId: item.ownerId!,
				pending: item.pending!,
				timestamp: now
			};
		});

		let journalEntryIds: string[];
		try {
			journalEntryIds = await this._aggregate.createJournalEntries(secCtx, journalEntries);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		const grpcJournalEntryIds: GrpcId[] = journalEntryIds.map((journalEntryId) => {
			return {grpcId: journalEntryId};
		});
		callback(null, {grpcIdArray: grpcJournalEntryIds});
	}

	private async _getAccountsByIds(
		call: ServerUnaryCall<GrpcIdArray, GrpcAccountArray>,
		callback: sendUnaryData<GrpcAccountArray>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcAccountIdsOutput: GrpcId[] = call.request.grpcIdArray || [];

		const accountIds: string[] = [];
		for (const grpcAccountIdOutput of grpcAccountIdsOutput) {
			if (!grpcAccountIdOutput.grpcId) {
				callback(
					{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(grpcAccountIdOutput.grpcId);
		}

		let accounts: AccountsAndBalancesAccount[];
		try {
			accounts = await this._aggregate.getAccountsByIds(secCtx, accountIds);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		const grpcAccounts: GrpcAccount[] = accounts.map((account) => {
			return this._accountToGrpcAccount(account);
		});
		callback(null, {grpcAccountArray: grpcAccounts});
	}

	private async _getAccountsByOwnerId(
		call: ServerUnaryCall<GrpcId, GrpcAccountArray>,
		callback: sendUnaryData<GrpcAccountArray>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const ownerId: string | undefined = call.request.grpcId;
		if (!ownerId) {
			callback(
				{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
				null
			);
			return;
		}

		let accounts: AccountsAndBalancesAccount[];
		try {
			accounts = await this._aggregate.getAccountsByOwnerId(secCtx, ownerId);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		const grpcAccounts: GrpcAccount[] = accounts.map((account) => {
			return this._accountToGrpcAccount(account);
		});
		callback(null, {grpcAccountArray: grpcAccounts});
	}

	private async _getJournalEntriesByAccountId(
		call: ServerUnaryCall<GrpcId, GrpcJournalEntryArray>,
		callback: sendUnaryData<GrpcJournalEntryArray>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const accountId: string | undefined = call.request.grpcId;
		if (!accountId) {
			callback(
				{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
				null
			);
			return;
		}

		let journalEntries: AccountsAndBalancesJournalEntry[];
		try {
			journalEntries = await this._aggregate.getJournalEntriesByAccountId(secCtx, accountId);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		const grpcJournalEntries: GrpcJournalEntry[] = journalEntries.map((journalEntry) => {
			const grpcJournalEntry: GrpcJournalEntry = {
				id: journalEntry.id ?? undefined,
				ownerId: journalEntry.ownerId ?? undefined,
				currencyCode: journalEntry.currencyCode,
				amount: journalEntry.amount,
				debitedAccountId: journalEntry.debitedAccountId,
				creditedAccountId: journalEntry.creditedAccountId,
				timestamp: journalEntry.timestamp ?? undefined
			};
			return grpcJournalEntry;
		});
		callback(null, {grpcJournalEntryArray: grpcJournalEntries});
	}

	private async _deleteAccountsByIds(
		call: ServerUnaryCall<GrpcIdArray, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcAccountIdsOutput: GrpcId[] = call.request.grpcIdArray || [];

		const accountIds: string[] = [];
		for (const grpcAccountIdOutput of grpcAccountIdsOutput) {

			if (!grpcAccountIdOutput.grpcId) {
				callback(
					{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(grpcAccountIdOutput.grpcId);
		}

		try {
			await this._aggregate.deleteAccountsByIds(secCtx, accountIds);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		callback(null, {});
	}

	private async _deactivateAccountsByIds(
		call: ServerUnaryCall<GrpcIdArray, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcAccountIdsOutput: GrpcId[] = call.request.grpcIdArray || [];

		const accountIds: string[] = [];
		for (const grpcAccountIdOutput of grpcAccountIdsOutput) {
			if (!grpcAccountIdOutput.grpcId) {
				callback(
					{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(grpcAccountIdOutput.grpcId);
		}

		try {
			await this._aggregate.deactivateAccountsByIds(secCtx, accountIds);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		callback(null, {});
	}

	private async _activateAccountsByIds(
		call: ServerUnaryCall<GrpcIdArray, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const grpcAccountIdsOutput: GrpcId[] = call.request.grpcIdArray || [];

		const accountIds: string[] = [];
		for (const grpcAccountIdOutput of grpcAccountIdsOutput) {
			// const accountId: string | undefined = grpcAccountIdOutput.grpcId;
			if (!grpcAccountIdOutput.grpcId) {
				callback(
					{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(grpcAccountIdOutput.grpcId);
		}

		try {
			await this._aggregate.reactivateAccountsByIds(secCtx, accountIds);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		callback(null, {});
	}

	private _accountToGrpcAccount(account: AccountsAndBalancesAccount): GrpcAccount {
		const grpcAccount: GrpcAccount = {
			id: account.id ?? undefined,
			ownerId: account.ownerId,
			state: account.state as AccountsAndBalancesAccountState,
			type: account.type as AccountsAndBalancesAccountType,
			currencyCode: account.currencyCode,
			postedDebitBalance: account.postedDebitBalance ?? undefined,
			pendingDebitBalance: account.pendingDebitBalance ?? undefined,
			postedCreditBalance: account.postedCreditBalance ?? undefined,
			pendingCreditBalance: account.pendingCreditBalance ?? undefined,
			balance: account.balance ?? undefined,
			timestampLastJournalEntry: account.timestampLastJournalEntry ?? undefined
		};
		return grpcAccount;
	}

	private _handleAggregateError(error: any): ServerErrorResponse {
		const srvError: ServerErrorResponse = {
			name: error.constructor.name,
			message: error.message || error.constructor.name,
			details: error.message || error.constructor.name,
		};

		if (error instanceof UnauthorizedError) {
			this._logger.warn(`Got UnauthorizedError - message: ${error.message}`);
			srvError.code = status.UNAUTHENTICATED;
		} else if (error instanceof ForbiddenError) {
			this._logger.warn(`Got ForbiddenError - message: ${error.message}`);
			srvError.code = status.PERMISSION_DENIED;
		} else if (error instanceof AccountNotFoundError) {
			this._logger.warn(`Got AccountNotFoundError - message: ${error.message}`);
			srvError.code = status.NOT_FOUND;
		} else {
			this._logger.warn(`Got unknown error message - message: ${error.message}`);
			srvError.code = status.UNKNOWN;
		}
		return srvError;
	}
}
*/
