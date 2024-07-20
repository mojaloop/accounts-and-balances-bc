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

 * Interledger Foundation
 - Pedro Sousa Barreto <pedrosousabarreto@gmail.com>

 --------------
 ******/

"use strict";
import * as dns from "dns";
import * as net from "net";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {AnbAccountType} from "@mojaloop/accounts-and-balances-bc-public-types-lib";
import {Currency} from "@mojaloop/platform-configuration-bc-public-types-lib";

const TIGERBEETLE_ACCOUNT_TYPE_MAP: {[key: string]: number} = {
    "HUB_RECONCILIATION": 1,
    "HUB_TMP_CONTROL": 2,
    "POSITION": 100,
    "LIQUIDITY": 101,
    "TIGERBEETLE_CONTROL": 666,
    "SETTLEMENT": 10_000,
};

export class TigerBeetleUtils{
    // inspired from https://stackoverflow.com/a/53751162/5743904
    static uuidToBigint(uuid: string) : bigint {
        // let hex = uuid.replaceAll("-",""); // replaceAll only works on es2021
        let hex = uuid.replace(/-/g, "");
        if (hex.length % 2) {
            hex = "0" + hex;
        }
        const bi = BigInt("0x" + hex);
        return bi;
    }

    static bigIntToUuid(bi: bigint, logger?:ILogger): string {
        let str = bi.toString(16);
        while (str.length < 32) str = "0"+str;

        if (str.length !== 32) {
            if(logger) logger.warn(`_bigIntToUuid() got string that is not 32 chars long: "${str}"`);
        } else {
            str = str.substring(0, 8)+"-"+str.substring(8, 12)+"-"+str.substring(12, 16)+"-"+str.substring(16, 20)+"-"+str.substring(20);
        }
        return str;
    }


    static ledgerNumFromCurrencyCode(currencyCode: string, currencies: Currency[]): number {
        const found = currencies.find(value => value.code === currencyCode);
        if(found == undefined){
            throw new Error(`Currency with code: '${currencyCode}' not found`);
        }

        const num:number = parseInt(found.num);
        if(num == undefined) {
            throw new Error(`Invalid currencyNum in currency: '${found.code}' - ${found.num} is not a number`);
        }
        return num;
    }

    static currencyCodeFromLedgerNum(ledger: number, currencies: Currency[]): string {
        const found = currencies.find(value => parseInt(value.num) === ledger);
        if(found == undefined){
            throw new Error(`Currency with num: '${ledger}' not found`);
        }
        return found.code;
    }

    static coaNumFromAccountType(type: AnbAccountType): number {
        const num:number | undefined = TIGERBEETLE_ACCOUNT_TYPE_MAP[type];
        if(num == undefined) {
            throw new Error(`Account type for type: "${type}" not found.`);
        }
        return num;
    }

    static accountTypeFromCoaCode(coaNum: number): AnbAccountType {
        const found =  Object.entries(TIGERBEETLE_ACCOUNT_TYPE_MAP).find((value) => value[1] === coaNum);
        if(found == undefined) {
            throw new Error(`Account type for coaNum: "${coaNum}" not found.`);
        }

        return found[0] as AnbAccountType;
    }

    // check if addresses are IPs or names, resolve if names
    static async parseAndLookupReplicaAddresses(replicaAddress:string[], logger:ILogger): Promise<string[]> {
        const replicaIpAddresses: string[] = [];
        for (const addr of replicaAddress) {
            logger.isDebugEnabled() && logger.debug(`Parsing addr: ${addr}`);
            const parts = addr.split(":");
            if (!parts) {
                const err = new Error(`Cannot parse replicaAddresses in TigerBeetleAdapter.init() - value: "${addr}"`);
                logger.error(err.message);
                throw err;
            }
            logger.isDebugEnabled() && logger.debug(`\t addr parts are: ${parts[0]} and ${parts[1]}`);

            if (net.isIP(parts[0]) === 0) {
                logger.isDebugEnabled() && logger.debug("\t addr part[0] is not an IP address, looking it up..");
                await dns.promises.lookup(parts[0], {family: 4}).then((resp) => {
                    logger.isDebugEnabled() && logger.debug(`\t lookup result is: ${resp.address}`);
                    replicaIpAddresses.push(`${resp.address}:${parts[1]}`);
                }).catch((error: Error) => {
                    const err = new Error(`Lookup error while parsing replicaAddresses in TigerBeetleAdapter.init() - cannot resolve: "${addr[0]}" of "${addr}"`);
                    logger.error(err.message);
                    throw err;
                });
            } else {
                logger.isDebugEnabled() && logger.debug("\t lookup not necessary, adding addr directly");
                replicaIpAddresses.push(addr);
            }
        }

        return replicaIpAddresses;
    }

}
