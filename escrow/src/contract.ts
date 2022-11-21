import {  NearBindgen, initialize, view, call, near, UnorderedMap, Vector, LookupSet, NearPromise, bytes } from "near-sdk-js";
import { ONE_YOCTO } from "near-sdk-js/lib/types"

const FIFTY_TGAS = BigInt(50000000000000)
const NO_DEPOSIT = BigInt(0)
const NO_ARGS = bytes(JSON.stringify({}))

@NearBindgen({ requireInit: true })
class EscrowContract {
  owner: String

  constructor() {
    this.owner = "nearloans.scryptok8.testnet"
  }

  @initialize({ privateFunction: true })
  init({ owner }: { owner: string }) {
    this.owner = owner
  }

  @view({})
  get_owner():String {
    return this.owner
  }

  @call({payableFunction: true})
  call_ft_transfer({ ft, to, amount }: { ft: string, to: string, amount: string }): NearPromise {
    if (near.predecessorAccountId() != this.owner) throw Error("only contract owner can initiate an ft transfer")

    const promise = NearPromise.new(ft)
    .functionCall("ft_transfer", bytes(JSON.stringify({ receiver_id: to, amount })), ONE_YOCTO, FIFTY_TGAS)
    .then(
      NearPromise.new(near.currentAccountId())
      .functionCall("callback_ft_on_transfer", NO_ARGS, NO_DEPOSIT, FIFTY_TGAS)
    )

    return promise.asReturn()
  }

  @call({privateFunction: true})
  callback_ft_on_transfer({ amount }:{ amount: string }): any {
    let { success } = promiseResult()

    if (success) {
      near.log(`ft transfer succeeded !`)

      return "0"
    } else {
      near.log("ft transfer failed...")

      return amount
    }
  }
}

function promiseResult(): {result: string, success: boolean}{
  let result, success;
  
  try { result = near.promiseResult(0); success = true }
  catch{ result = undefined; success = false }
  
  return {result, success}
}