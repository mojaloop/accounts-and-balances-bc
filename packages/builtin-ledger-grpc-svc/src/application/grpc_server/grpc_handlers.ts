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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    ServerUnaryCall,
    sendUnaryData,
    status,
    ServerErrorResponse
} from "@grpc/grpc-js";
import {TokenHelper} from "@mojaloop/security-bc-client-lib";
import {BuiltinLedgerJournalEntryDto, CreatedIdMapResponse} from "../../domain/entities";
import {
    BuiltinLedgerAggregate,
    CancelReservationAndCommitRequest, CancelReservationRequest,
    CheckLiquidAndReserveRequest,
    LedgerBatchRequest
} from "../../domain/aggregate";
import {ForbiddenError, UnauthorizedError, CallSecurityContext} from "@mojaloop/security-bc-public-types-lib";

import {
    BuiltinLedgerGrpcAccount__Output,
    BuiltinLedgerGrpcAccountArray__Output,
    BuiltinLedgerGrpcId,
    BuiltinLedgerGrpcId__Output,
    BuiltinLedgerGrpcIdArray,
    BuiltinLedgerGrpcIdArray__Output,
    BuiltinLedgerGrpcJournalEntry__Output,
    BuiltinLedgerGrpcCreateAccountArray,
    BuiltinLedgerGrpcCreatedId,
    BuiltinLedgerGrpcCreateIdsResponse__Output,
    BuiltinLedgerGrpcCreateAccount,
    BuiltinLedgerGrpcCreateJournalEntry,
    BuiltinLedgerGrpcCreateJournalEntryArray,
    BuiltinLedgerGrpcJournalEntryArray__Output,
    GrpcBuiltinLedgerHandlers,
    Empty, BuiltinLedgerGrpcHighLevelRequestArray,
    BuiltinLedgerGrpcHighLevelRequest,
    BuiltinLedgerGrpcHighLevelResponse,
    BuiltinLedgerGrpcHighLevelResponseArray
} from "@mojaloop/accounts-and-balances-bc-builtin-ledger-grpc-client-lib";
import {
    AccountNotFoundError,
    AccountsAndBalancesAccountState,
    AccountsAndBalancesAccountType,
    AccountsAndBalancesError,
    AccountsBalancesHighLevelRequestTypes, IAccountsBalancesHighLevelRequest,
    IAccountsBalancesHighLevelResponse
} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import { BuiltinLedgerAccountDto } from "../../domain/entities";
import {IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";



const UNKNOWN_ERROR_MESSAGE = "unknown error";

const IDEAL_BATCH_SIZE = 10;
const MAX_QUEUE_DEPTH = 100;
const QUEUE_PROCESS_MIN_DELAY_MS = 250;
const INTERVAL_MS = 35;

declare class BaseQueueItem{
    id:string;
    timerEndFn:any;
}

declare class CheckLiquidAndReserveQueueItem extends BaseQueueItem {
    request: CheckLiquidAndReserveRequest;
    callback: sendUnaryData<Empty>;
}

declare class CancelReservationAndCommitQueueItem extends BaseQueueItem{
    request: CancelReservationAndCommitRequest;
    callback: sendUnaryData<Empty>;
}
declare class CancelReservationQueueItem extends BaseQueueItem{
    request: CancelReservationRequest;
    callback: sendUnaryData<Empty>;
}

export class BuiltinLedgerGrpcHandlers {
	// Properties received through the constructor.
	private readonly _logger: ILogger;
	private readonly _aggregate: BuiltinLedgerAggregate;
	private readonly _tokenHelper: TokenHelper;
    private readonly _histo:IHistogram;
    // private _checkLiquidAndReserveQueue:CheckLiquidAndReserveQueueItem[] = [];
    // private _cancelReservationAndCommitQueue:CancelReservationAndCommitQueueItem[] = [];
    // private _cancelReservationQueue:CancelReservationQueueItem[] = [];

    //private _stream: ServerDuplexStream<HighLevelStreamRequest, HighLevelStreamResponse>;

    //private _queue:(CheckLiquidAndReserveQueueItem|CancelReservationAndCommitQueueItem|CancelReservationQueueItem)[] = [];

    constructor(
		logger: ILogger,
		tokenHelper: TokenHelper,
        metrics:IMetrics,
		aggregate: BuiltinLedgerAggregate
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._tokenHelper = tokenHelper;
		this._aggregate = aggregate;

        this._histo = metrics.getHistogram("BuiltinLedgerGrpcHandler", "GRPC requests handled by the Accounts and Balances Builtin Ledger GRPC Handler", ["callName", "success"]);

        /*
        // start the queue process
        setInterval(()=>{
            if(this._processing) return;
            setImmediate(()=>{
                this._processQueue();
            });
        }, INTERVAL_MS);
        */
	}


	getHandlers(): GrpcBuiltinLedgerHandlers {

        return {
			"CreateAccounts": this._createAccounts.bind(this),
			"CreateJournalEntries": this._createJournalEntries.bind(this),
			"GetAccountsByIds": this._getAccountsByIds.bind(this),
			"GetJournalEntriesByAccountId": this._getJournalEntriesByAccountId.bind(this),
			"DeleteAccountsByIds": this._deleteAccountsByIds.bind(this),
			"DeactivateAccountsByIds": this._deactivateAccountsByIds.bind(this),
			"ActivateAccountsByIds": this._activateAccountsByIds.bind(this),
            // "CheckLiquidAndReserve": this._checkLiquidAndReserve.bind(this),
            // "CancelReservationAndCommit": this._cancelReservationAndCommit.bind(this),
            // "CancelReservation": this._cancelReservation.bind(this),
            "ProcessHighLevelBatch": this._processHighLevelBatch.bind(this)
            /*// eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            "StreamRequest": this._streamRequest.bind(this)*/
		};
	}

	/**
	 * This will return the secCtx if successful,
	 * if not will call the callback with the correct err and return null
	 * @param call ServerUnaryCall
	 * @param callback sendUnaryData
	 * @private
	 */
	private async _getSecCtxFromCall(call: ServerUnaryCall<any, any>, callback: sendUnaryData<any>): Promise<CallSecurityContext | null> {
        const timerEndFn = this._histo.startTimer({callName: "_getSecCtxFromCall"});

        const returnUnauthorized = (msg:string)=>{
            timerEndFn({success: "false"});
			callback(this._handleAggregateError(new UnauthorizedError(msg)));
			return null;
		};

		const callTokenMeta = call.metadata.get("TOKEN");
		if (!callTokenMeta) return returnUnauthorized("Could not get token from call metadata");

		const bearerToken = callTokenMeta[0] as string;
		if (!bearerToken) return returnUnauthorized("Could not get token from call metadata array (metadata key exists)");

		let verified;
		try {
			verified = await this._tokenHelper.verifyToken(bearerToken);
		} catch (err) {
			this._logger.error(err, "Unable to verify token - verifyToken() failed");
			return returnUnauthorized("Unable to verify token - verifyToken() failed");
		}
		if (!verified) {
			this._logger.warn("Unable to verify token - verifyToken() return false");
			return returnUnauthorized("Unable to verify token - verifyToken() return false");
		}

		const decoded = this._tokenHelper.decodeToken(bearerToken);
		if (!decoded.sub || decoded.sub.indexOf("::")== -1) {
			this._logger.warn("Unable to decodeToken token");
			return returnUnauthorized("Unable to decodeToken token");
		}

		const subSplit = decoded.sub.split("::");
		const subjectType = subSplit[0];
		const subject = subSplit[1];

        timerEndFn({success: "true"});
		return {
			accessToken: bearerToken,
			clientId: subjectType.toUpperCase().startsWith("APP") ? subject:null,
			username: subjectType.toUpperCase().startsWith("USER") ? subject:null,
			rolesIds: decoded.roles
		};
	}

    private async _processHighLevelBatch(
        call: ServerUnaryCall<BuiltinLedgerGrpcHighLevelRequestArray, BuiltinLedgerGrpcHighLevelResponseArray>,
        callback: sendUnaryData<BuiltinLedgerGrpcHighLevelResponseArray>
    ):Promise<void>{
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return; // callback was called by _getSecCtxFromCall()

        const timerEndFn = this._histo.startTimer({callName: "processHighLevelBatch"});

        const grpcReq: BuiltinLedgerGrpcHighLevelRequestArray = call.request;
        if(!grpcReq.requestArray) throw new AccountsAndBalancesError("Invalid requestArray in BuiltinLedgerGrpcHighLevelRequest request");

        const highLevelRequests:IAccountsBalancesHighLevelRequest[] = [];

        // TODO remove console.log()
        console.log(`BuiltinLedgerGrpcHandlers _processHighLevelBatch() start with batch of: ${grpcReq.requestArray.length}`);
        const startTime = Date.now();

        try {

            grpcReq.requestArray.forEach(req => {
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
            });

            const highLevelResponses: IAccountsBalancesHighLevelResponse[] =
                await this._aggregate.processHighLevelBatch(secCtx, highLevelRequests);

            // map response
            const grpcResponse:BuiltinLedgerGrpcHighLevelResponseArray ={
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

            // TODO remove console.log()
            console.log(`BuiltinLedgerGrpcHandlers _processHighLevelBatch() completed with batch of: \t${grpcReq.requestArray.length}`);
            console.log(`took: ${Date.now()-startTime}`);
            console.log("\n\n");

            return callback(null, grpcResponse);
        }catch(error){
            timerEndFn({success: "false"});
            return callback(this._handleAggregateError(error));
        }
    }

    private _validateHighLevelRequest(req:BuiltinLedgerGrpcHighLevelRequest):void{
        // common errors
        if(!req.hubJokeAccountId){
            throw new AccountsAndBalancesError("Invalid hubJokeAccountId on BuiltinLedgerGrpcHighLevelRequest request");
        }
        if(!req.payerPositionAccountId){
            throw new AccountsAndBalancesError("Invalid payerPositionAccountId on BuiltinLedgerGrpcHighLevelRequest request");
        }
        if (!req.transferAmount) {
            throw new AccountNotFoundError("Invalid transferAmount on BuiltinLedgerGrpcHighLevelRequest request");
        }
        if (!req.currencyCode) {
            throw new AccountNotFoundError("Invalid currencyCode on BuiltinLedgerGrpcHighLevelRequest request");
        }
        if (!req.transferId) {
            throw new AccountsAndBalancesError("Invalid transferId on BuiltinLedgerGrpcHighLevelRequest request");
        }

        if(req.requestType === AccountsBalancesHighLevelRequestTypes.checkLiquidAndReserve){
            if(!req.payerLiquidityAccountId){
                throw new AccountsAndBalancesError("Invalid payerLiquidityAccountId on BuiltinLedgerGrpcHighLevelRequest request");
            }
            if (!req.payerNetDebitCap) {
                throw new AccountsAndBalancesError("Invalid payerNetDebitCap on BuiltinLedgerGrpcHighLevelRequest request");
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
            throw new Error("Invalid BuiltinLedgerGrpcHighLevelRequest.requestType");
        }
    }


    /*private _streamRequest(
        stream: ServerDuplexStream<HighLevelStreamRequest, HighLevelStreamResponse>
    ){
        stream.on("data", (req: HighLevelStreamRequest) => {
            console.log(req);
        }).on("end", () => {
            stream.end();
        }).on("error", (err: Error) => {
            this._logger.error("_streamRequest", err);
        });
    }

    private _triggerQueue():void{
        if(this._processing) return;
        setImmediate(()=>{
            this._processQueue();
        });
    }

    private _processing = false;
    private _lastProcessedTimesamp = 0;
    private _processQueue(){
        if(this._processing || this._queue.length == 0) return;

        const msSinceLast = Date.now() - this._lastProcessedTimesamp;
        if(this._queue.length > IDEAL_BATCH_SIZE || msSinceLast > QUEUE_PROCESS_MIN_DELAY_MS) {
            this._processing = true;

            console.debug(`Processing queue - length is: ${this._queue.length} - msSinceLast: ${msSinceLast}`);

            this._aggregate.processBatch(this._queue).then((responses)=>{
                for(const resp of responses){
                    const reqIndex = this._queue.findIndex(value => value.id = resp.id);
                    if(reqIndex == -1){
                        throw new Error("Could not find request for Aggregate.processBatch response");
                    }
                    this._queue[reqIndex].timerEndFn({success: "true"});
                    this._queue[reqIndex].callback(null, {});

                    this._queue.splice(reqIndex,1);
                }
            }).catch(reason => {
                this._logger.error(reason);

            }).finally(()=>{
                this._lastProcessedTimesamp = Date.now();
                this._processing = false;
                // setImmediate(()=>{this._processQueue();});
                // setInterval(()=>{
                //    this._processQueue();
                // }, INTERVAL_MS);
            });
        }
    }*/

	private async _createAccounts(
		call: ServerUnaryCall<BuiltinLedgerGrpcCreateAccountArray, BuiltinLedgerGrpcCreateIdsResponse__Output>,
		callback: sendUnaryData<BuiltinLedgerGrpcCreateIdsResponse__Output>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const requestArray: BuiltinLedgerGrpcCreateAccount[] = call.request.accountsToCreate || [];

		const createAccountReqs: {requestedId: string, accountType: AccountsAndBalancesAccountType, currencyCode: string }[]
			= requestArray.map(value => {
			return {
				requestedId: value.requestedId!,
				accountType: value.type! as AccountsAndBalancesAccountType,
				currencyCode: value.currencyCode!
			};
		});

		let accountIds: CreatedIdMapResponse[];
		try {
			accountIds = await this._aggregate.createAccounts(secCtx, createAccountReqs);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		const resp: BuiltinLedgerGrpcCreatedId[] = accountIds.map(value => {
			return {requestedId: value.requestedId, attributedId: value.attributedId};
		});
		callback(null, {ids: resp});
	}


	private async _createJournalEntries(
		call: ServerUnaryCall<BuiltinLedgerGrpcCreateJournalEntryArray, BuiltinLedgerGrpcCreateIdsResponse__Output>,
		callback: sendUnaryData<BuiltinLedgerGrpcIdArray__Output>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return;

        const timerEndFn = this._histo.startTimer({callName: "_createJournalEntries"});
		const requestArray: BuiltinLedgerGrpcCreateJournalEntry[] = call.request.entriesToCreate || [];

		const now = Date.now();

		const createEntriesRequests: {
			amountStr: string, currencyCode: string,
			creditedAccountId: string, debitedAccountId: string, timestamp: number, ownerId: string, pending: boolean
		}[] = requestArray.map(value => {
			return {
				amountStr: value.amount!,
				pending: value.pending!,
				creditedAccountId: value.creditedAccountId!,
				debitedAccountId: value.debitedAccountId!,
				currencyCode: value.currencyCode!,
				ownerId: value.ownerId!,
				timestamp: now
			};
		});

		let createdIds: string[];
		try {
			createdIds = await this._aggregate.createJournalEntries(secCtx, createEntriesRequests);
		} catch (error: any) {
            timerEndFn({success: "false"});
			return callback(this._handleAggregateError(error));
		}

		const resp:BuiltinLedgerGrpcId[] = createdIds.map(value => {
			return {builtinLedgerGrpcId: value};
		});
        timerEndFn({success: "true"});
		callback(null, {builtinLedgerGrpcIdArray: resp});
	}

	private async _getAccountsByIds(
		call: ServerUnaryCall<BuiltinLedgerGrpcIdArray, BuiltinLedgerGrpcAccountArray__Output>,
		callback: sendUnaryData<BuiltinLedgerGrpcAccountArray__Output>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return;

        const timerEndFn = this._histo.startTimer({callName: "_getAccountsByIds"});
		const requestIds: BuiltinLedgerGrpcId__Output[] = call.request.builtinLedgerGrpcIdArray || [];

		const accountIds: string[] = [];
		for (const builtinLedgerGrpcAccountIdOutput of requestIds) {
			if (!builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId) {
				callback(
					{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
					null
				);
				return;
			}
			accountIds.push(builtinLedgerGrpcAccountIdOutput.builtinLedgerGrpcId);
		}

		let foundAccountsDtos: BuiltinLedgerAccountDto[];
		try {
			foundAccountsDtos = await this._aggregate.getAccountsByIds(secCtx, accountIds);
		} catch (error: any) {
            timerEndFn({success: "false"});
			return callback(this._handleAggregateError(error));
		}

		const returnAccounts = foundAccountsDtos.map((accountDto) => {
			const grpcAccount: BuiltinLedgerGrpcAccount__Output = {
				id: accountDto.id ?? undefined,
				state: accountDto.state,
				type: accountDto.type,
				currencyCode: accountDto.currencyCode,
				postedDebitBalance: accountDto.postedDebitBalance ?? undefined,
				pendingDebitBalance: accountDto.pendingDebitBalance ?? undefined,
				postedCreditBalance: accountDto.postedCreditBalance ?? undefined,
				pendingCreditBalance: accountDto.pendingCreditBalance ?? undefined,
				timestampLastJournalEntry: accountDto.timestampLastJournalEntry ?? undefined
			};
			return grpcAccount;
		});

        timerEndFn({success: "true"});
		callback(null, {builtinLedgerGrpcAccountArray: returnAccounts});
	}

	private async _getJournalEntriesByAccountId(
		call: ServerUnaryCall<BuiltinLedgerGrpcId, BuiltinLedgerGrpcJournalEntryArray__Output>,
		callback: sendUnaryData<BuiltinLedgerGrpcJournalEntryArray__Output>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if (!secCtx) return;

		const accountId: string | undefined = call.request.builtinLedgerGrpcId;
		if (!accountId) {
			callback(
				{code: status.UNKNOWN, details: UNKNOWN_ERROR_MESSAGE},
				null
			);
			return;
		}

		let foundDtos: BuiltinLedgerJournalEntryDto[];
		try {
			foundDtos = await this._aggregate.getJournalEntriesByAccountId(secCtx, accountId);
		} catch (error: unknown) {
			return callback(this._handleAggregateError(error));
		}

		const returnEntries: BuiltinLedgerGrpcJournalEntry__Output[] = foundDtos.map((dto) => {
			const grpcJournalEntry: BuiltinLedgerGrpcJournalEntry__Output = {
				id: dto.id ?? undefined,
				currencyCode: dto.currencyCode,
				amount: dto.amount,
				debitedAccountId: dto.debitedAccountId,
				creditedAccountId: dto.creditedAccountId,
				timestamp: dto.timestamp || undefined
			};
			return grpcJournalEntry;
		});

		callback(null, {builtinLedgerGrpcJournalEntryArray: returnEntries});
	}

	private async _deleteAccountsByIds(
		call: ServerUnaryCall<BuiltinLedgerGrpcIdArray__Output, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const inputAccountIds: BuiltinLedgerGrpcId__Output[] = call.request.builtinLedgerGrpcIdArray || [];

		// map request to struct used to send to the aggregate
		const accountIds: string[] = inputAccountIds.map(value => value.builtinLedgerGrpcId!);

		try {
			await this._aggregate.deleteAccountsByIds(secCtx, accountIds);
		} catch (error: any) {
			return callback(this._handleAggregateError(error));
		}

		callback(null, {});
	}

	private async _deactivateAccountsByIds(
		call: ServerUnaryCall<BuiltinLedgerGrpcIdArray__Output, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const inputAccountIds: BuiltinLedgerGrpcId__Output[] = call.request.builtinLedgerGrpcIdArray || [];

		// map request to struct used to send to the aggregate
		const accountIds: string[] = inputAccountIds.map(value => value.builtinLedgerGrpcId!);

		try {
			await this._aggregate.deactivateAccountsByIds(secCtx, accountIds);
		} catch (error: any) {
			return callback(this._handleAggregateError(error));
		}

		callback(null, {});
	}

	private async _activateAccountsByIds(
		call: ServerUnaryCall<BuiltinLedgerGrpcIdArray, Empty>,
		callback: sendUnaryData<Empty>
	): Promise<void> {
		const secCtx = await this._getSecCtxFromCall(call, callback);
		if(!secCtx) return; // callback was called by _getSecCtxFromCall()

		const inputAccountIds: BuiltinLedgerGrpcId__Output[] = call.request.builtinLedgerGrpcIdArray || [];

		// map request to struct used to send to the aggregate
		const accountIds: string[] = inputAccountIds.map(value => value.builtinLedgerGrpcId!);

		try {
			await this._aggregate.activateAccountsByIds(secCtx, accountIds);
		} catch (error: any) {
			return callback(this._handleAggregateError(error));
		}

		callback(null, {});
	}

/*

    private async _checkLiquidAndReserve(
        call: ServerUnaryCall<GrpcCheckLiquidAndReserveRequest, Empty>,
        callback: sendUnaryData<Empty>
    ): Promise<void>{
        console.debug(`checkLiquidAndReserve start - queue length: ${this._queue.length}`);

        const timerEndFn = this._histo.startTimer({callName: "_checkLiquidAndReserve"});
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return; // callback was called by _getSecCtxFromCall()

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

        const batchedReq = new CheckLiquidAndReserveRequest();
        batchedReq.secCtx = secCtx;
        batchedReq.payerPositionAccountId = req.payerPositionAccountId;
        batchedReq.payerLiquidityAccountId = req.payerLiquidityAccountId;
        batchedReq.hubJokeAccountId = req.hubJokeAccountId;
        batchedReq.transferAmount = req.transferAmount;
        batchedReq.currencyCode = req.currencyCode;
        batchedReq.payerNetDebitCap = req.payerNetDebitCap;
        batchedReq.transferId = req.transferId;

        this._queue.push({
            id: randomUUID(),
            timerEndFn: timerEndFn,
            request: batchedReq,
            callback: callback
        });

       // this._triggerQueue();
    }

    private async _cancelReservationAndCommit(
        call: ServerUnaryCall<GrpcCancelReservationAndCommitRequest, Empty>,
        callback: sendUnaryData<Empty>
    ): Promise<void> {
        console.debug(`cancelReservationAndCommit start - queue length: ${this._queue.length}`);

        const timerEndFn = this._histo.startTimer({callName: "_cancelReservationAndCommit"});
        const secCtx = await this._getSecCtxFromCall(call, callback);
        if (!secCtx) return; // callback was called by _getSecCtxFromCall()

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

        const batchedReq = new CancelReservationAndCommitRequest();
        batchedReq.secCtx = secCtx;
        batchedReq.payerPositionAccountId = req.payerPositionAccountId;
        batchedReq.payeePositionAccountId = req.payeePositionAccountId;
        batchedReq.hubJokeAccountId = req.hubJokeAccountId;
        batchedReq.transferAmount = req.transferAmount;
        batchedReq.currencyCode = req.currencyCode;
        batchedReq.transferId = req.transferId;

        this._queue.push({
            id: randomUUID(),
            timerEndFn: timerEndFn,
            request: batchedReq,
            callback: callback
        });

       // this._triggerQueue();
    }

    private async _cancelReservation(
        call: ServerUnaryCall<GrpcCancelReservationRequest, Empty>,
        callback: sendUnaryData<Empty>
    ): Promise<void> {
        console.debug(`_cancelReservation start - queue length: ${this._queue.length}`);
        while(this._queue.length >= MAX_QUEUE_DEPTH){
            console.debug("queue busy");
        }

        const timerEndFn = this._histo.startTimer({callName: "_cancelReservationAndCommit"});
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

        const batchedReq = new CancelReservationRequest();
        batchedReq.secCtx = secCtx;
        batchedReq.payerPositionAccountId = req.payerPositionAccountId;
        batchedReq.hubJokeAccountId = req.hubJokeAccountId;
        batchedReq.transferAmount = req.transferAmount;
        batchedReq.currencyCode = req.currencyCode;
        batchedReq.transferId = req.transferId;

        this._queue.push({
            id: randomUUID(),
            timerEndFn: timerEndFn,
            request: batchedReq,
            callback: callback
        });

       // this._triggerQueue();
    }

*/

    private _handleAggregateError(error:any): ServerErrorResponse{
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
