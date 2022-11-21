import {  NearBindgen, initialize, view, call, near, UnorderedMap, Vector, LookupSet, NearPromise, bytes } from "near-sdk-js";
import { ONE_TERA_GAS, ONE_YOCTO } from "near-sdk-js/lib/types"

const FIFTY_TGAS = BigInt(50000000000000)
const TWO_HUNDREDS_TGAS = BigInt(200000000000000)
const DAY_NANO_MS = BigInt(86400000000000)
const NO_DEPOSIT = BigInt(0)
const NO_ARGS = bytes(JSON.stringify({}))

@NearBindgen({ requireInit: true })
class LoanContract {
  message: String
  escrow: String
  loans: UnorderedMap
  loansBalances: UnorderedMap
  borrowers: UnorderedMap
  lenders: UnorderedMap
  borrowersLoans: UnorderedMap
  lendersLoans: UnorderedMap
  supportedTokens: UnorderedMap

  constructor() {
    this.message = ""
    this.loans = new UnorderedMap('loans')
    this.borrowers = new UnorderedMap('borrowers')
    this.lenders = new UnorderedMap('lenders')
    this.borrowersLoans = new UnorderedMap('borrowers-loans')
    this.lendersLoans = new UnorderedMap('lenders-loans')
    this.supportedTokens = new UnorderedMap('supported-tokens')
  }

  @initialize({privateFunction: true})
  init({ message, escrow }: { message: string, escrow: string }) {
    this.message = message
    this.escrow = escrow
    
    const supportedTokens: Map<string, string> = new Map([
      ["TOKEN1","token1.scryptok8.testnet"],
      ["TOKEN2","token2.scryptok8.testnet"]
    ]);

    for(let [token, account] of Object.entries(supportedTokens)) {
      this.supportedTokens.set(token, account)
    }
  }

  /**
   * VIEW METHODS
   */

  @view({})
  get_greeting(): String {
    return this.message
  }

  @view({})
  get_borrowers(): any {
    const borrowers = this.borrowers

    if (borrowers == null) return []

    return borrowers.toArray()
  }

  @view({})
  get_lenders(): any {    
    const lenders = this.lenders

    if (lenders == null) return []

    return lenders.toArray()
  }

  @view({})
  get_borrowers_loans(): any {
    const borrowersLoans = this.borrowersLoans

    if (borrowersLoans == null) return []

    return borrowersLoans.toArray()
  }

  @view({})
  get_lenders_loans(): any {
    const lendersLoans = this.lendersLoans

    if (this.lendersLoans == null) return []

    return lendersLoans.toArray()
  }

  @view({})
  get_escrow():String {
    return this.escrow
  }

  @view({})
  get_supported_tokens(): any {
    return this.supportedTokens.toArray().map(([token]) => token)
  }

  @view({})
  get_loan({ id }: { id: string }): any {
    const loan = this.loans.get(id)

    assert(loan, "loan not exists")

    return loan
  }

  @view({})
  get_loans({ borrower, lender }: { borrower: string, lender: string }): any {
    assert(!borrower || !lender, "only one of 'borrower' or 'lender' arguments can be specified")

    if (borrower) {
      const borrowerLoansIds = this.borrowersLoans.get(borrower)

      assert(borrowerLoansIds, "no loan for borrower")
      
      const borrowerLoans = []

      for (let loanId of (borrowerLoansIds as Array<any>)) {
        const loan = this.loans.get(loanId)
        if (loan != null) borrowerLoans.push(loan)     
      }

      return borrowerLoans
    } 

    if (lender) {
      const lenderLoansIds = this.lendersLoans.get(lender)

      assert(lenderLoansIds, "no loan for lender")
      
      const lenderLoans = []

      for (let loanId of (lenderLoansIds as Array<any>)) {
        const loan = this.loans.get(loanId)
        if (loan != null) lenderLoans.push(loan)
      }

      return lenderLoans
    } 

    const loans = this.loans

    if (loans == null) return []

    return loans.toArray().map(([id, loan]) => loan)
  }

  @view({})
  get_loan_interest({ id }: { id: string }): any {
    const loan = this.loans.get(id)

    assert(loan != null, "loan not exists")
    assert(loan["status"] == "ACTIVE", "No interests to collect. Loan is not active.")

    const totalCost = Math.floor(parseInt(loan["capital"]) * ( 1 + parseInt(loan["rate"]) * 0.01 ))
    const collectedSoFar = loan["collected"] ? parseInt(loan["collected"]) : 0

    assert(collectedSoFar < totalCost, "No interest to collect. Loan fully repaid.")

    const start = BigInt(loan["createdAt"])
    const now =  near.blockTimestamp()
    const elapsed = now - start
    const durationDays = BigInt(loan["duration"]) 
    const duration = durationDays * DAY_NANO_MS
    const loanProgressRatio = Number(elapsed) / Number(duration)
    const collectableSoFar = Math.floor(loanProgressRatio * totalCost)
    const collectable = collectableSoFar - collectedSoFar
    const currency = loan["currency"]

    return { collectable: ""+ collectable, currency }
  }

  @view({})
  get_stats(): any {    
    const stats = {}
    const loans = this.loans.toArray().map(([id, loan]) => loan)
    const supportedTokens = this.supportedTokens.toArray().map(([token]) => token)

    for (let token of supportedTokens) {
      const tokenLoans = loans.filter((loan) => loan["currency"] == token)
      const tokenStatsComputation = tokenLoans.reduce((accumulator, loan) => { 
        accumulator["volume"] += parseInt(loan["capital"])
        if (loan["borrower"] && !accumulator["borrowers"][loan["borrower"]]) {
          accumulator["borrowers"][loan["borrower"]] = true
          accumulator["borrowersCount"]++
        }
        if (loan["lender"] && !accumulator["lenders"][loan["lender"]]) {
          accumulator["lenders"][loan["lender"]] = true
          accumulator["lendersCount"]++
        }
        return accumulator
      }, { borrowers: {}, lenders: {}, borrowersCount: 0, lendersCount: 0, volume: 0 })

      stats[token] = {
        volume: tokenStatsComputation["volume"],
        borrowers: tokenStatsComputation["borrowersCount"],
        lenders: tokenStatsComputation["lendersCount"],
        interests: 0,
        frequency: 3600 * 24
      }
    }

    return stats
  }

  /**
   * CALL METHODS
   */

  @call({})
  set_greeting({ message }: { message: string }): any {
    this.message = message

    return true
  }

  @call({})
  set_escrow({ escrow }: { escrow: string}): any {
    this.escrow = escrow

    return true
  }

  @call({})
  add_supported_token({ token, account }: { token: string, account: string }): any {
    this.supportedTokens.set(token, account)
    near.log(`support added for token ${token}`)
    return true
  }

  @call({})
  remove_supported_token({ token }: { token: string }): any {
    this.supportedTokens.remove(token)
    near.log(`support removed for token ${token}`)
    return true
  }

  @call({})
  ft_on_transfer({ sender_id, msg, amount }: { sender_id: string, msg: string, amount: string }): any {
    const payload = JSON.parse(msg)
    const operation = payload["operation"]
    const params = payload["params"]

    let loan
    let borrower

    switch(operation) {
      case "create_loan":
        loan = Object.assign({ borrower: sender_id }, params, { guarantor: sender_id, mode: "BORROW", type: "AMORTIZED" })

        assert(amount == loan.capital, "amount must be equal to loan capital" ) 

        return NearPromise.new(near.predecessorAccountId())
        .functionCall("ft_transfer", bytes(JSON.stringify({ receiver_id: this.escrow, amount: amount, memo: msg })), ONE_YOCTO, FIFTY_TGAS)
        .then(
          NearPromise.new(near.currentAccountId())
          .functionCall("create_loan", bytes(JSON.stringify(loan)), NO_DEPOSIT, FIFTY_TGAS)
        )
        .then(
          NearPromise.new(near.currentAccountId())
          .functionCall("callback_ft_on_transfer", bytes(JSON.stringify({ amount, success: true, id: loan["id"] })), NO_DEPOSIT, FIFTY_TGAS)
        )
        .asReturn()

      case "accept_loan":
        Object.assign(params, { lender: sender_id })

        loan = this.get_loan({ id: params["id"] })

        assert(loan, "loan not exists")
        assert(!loan["locked"], "loan is locked, please retry later")
        assert(loan["status"] == "PENDING", "only pending loans can be accepted")
        assert(amount == loan.capital, "amount must be equal to loan capital")

        // lock the loan. unlock it later.
        loan["locked"] = true 
        this.loans.set(loan["id"], loan)
        
        borrower = loan["borrower"]

        return NearPromise.new(near.predecessorAccountId())
        .functionCall("ft_transfer", bytes(JSON.stringify({ receiver_id: borrower, amount, memo: msg })), ONE_YOCTO, FIFTY_TGAS)
        .then(
          NearPromise.new(near.currentAccountId())
          .functionCall("accept_loan", bytes(JSON.stringify(params)), NO_DEPOSIT, FIFTY_TGAS)
        )
        .then(
          NearPromise.new(near.currentAccountId())
          .functionCall("callback_ft_on_transfer", bytes(JSON.stringify({ amount, success: true, id: loan["id"] })), NO_DEPOSIT, FIFTY_TGAS)          
        )
        .asReturn()

      case "increase_loan_deposit":
        Object.assign(params, { amount })

        loan = this.get_loan({ id: params["id"] })

        assert(loan, "loan not exists")
        assert(!loan["locked"], "loan is locked, please retry later")

        // lock the loan. unlock it later.
        loan["locked"] = true 
        this.loans.set(loan["id"], loan)

        const deposit = loan["deposit"] ? parseInt(loan["deposit"]) : 0
        const newDeposit = deposit + parseInt(amount)
        const collected = loan["collected"] ? parseInt(loan["collected"]) : 0
        const capital = parseInt(loan["capital"])
        const collectable =  capital - collected

        assert(newDeposit <= collectable, "deposit can't exceed the total remaining interest" ) 

        return NearPromise.new(near.predecessorAccountId())
        .functionCall("ft_transfer", bytes(JSON.stringify({ receiver_id: this.escrow, amount, memo: msg })), ONE_YOCTO, FIFTY_TGAS)
        .then(
          NearPromise.new(near.currentAccountId())
          .functionCall("increase_loan_deposit", bytes(JSON.stringify(params)), NO_DEPOSIT, FIFTY_TGAS)
        )
        .then(
          NearPromise.new(near.currentAccountId())
          .functionCall("callback_ft_on_transfer", bytes(JSON.stringify({ amount, success: true, id: loan["id"] })), NO_DEPOSIT, FIFTY_TGAS)          
        )
        .asReturn()
    }
  }

  @call({privateFunction: true})
  callback_ft_on_transfer({ amount, success, id }:{ amount: string, success: boolean, id: string }): any {
    // always called as a last callback to return the amount of unused tokens to calling ft_transfer_call method of ft contract 
    let { success: promiseSuccess } = promiseResult()

    // unlock the loan.
    const loan = this.get_loan({ id })
    loan["locked"] = false 
    this.loans.set(loan["id"], loan)

    if (promiseSuccess && success) {
      near.log(`ft transfer succeeded !`)

      return "0"
    } else {
      near.log("ft transfer failed...")

      return amount
    }
  }

  @call({ privateFunction: true })
  create_loan({ mode, type, borrower, lender, guarantor, currency, capital, rate, frequency, duration, title, description, link }: { mode: string, type: string, borrower: string, lender: string, guarantor: string, currency: string, capital: bigint, rate: number, frequency: number, duration: number, expiration: number, title: string, description: string, link: string }): any {
    const timestamp = near.blockTimestamp()
    const expirationTimestamp = timestamp + BigInt(7) * BigInt(DAY_NANO_MS)
    const createdAt = timestamp.toString()
    const expiredAt = expirationTimestamp.toString()
    const id = createdAt + "-" + Math.floor(Math.random() * 1000000000) + 1

    // define new loan
    const loan = {
      "id": id,
      "type": type,
      "currency": currency, 
      "capital": capital,
      "rate": rate,
      "frequency": frequency,
      "duration": duration,
      "expiredAt": expiredAt,
      "createdAt": createdAt,
      "status": "PENDING",
      "title": title,
      "description": description,
      "link": link,
      "borrower": borrower,
      "lender": lender,
      "guarantor": guarantor,
      "locked": true
    }

    switch(mode) {
      case "BORROW":
      default:
        // loan created by a borrower
        const borrower = loan["borrower"]
        this.borrowers.set(borrower, true)
        // track loan in borrower loans
        const borrowerLoans = this.borrowersLoans.get(borrower)
        if (borrowerLoans !== null) {
          (borrowerLoans as Array<any>).push(id)
          this.borrowersLoans.set(borrower, borrowerLoans)
        } else {
          const newBorrowerLoans = new Array()
          newBorrowerLoans.push(id)
          this.borrowersLoans.set(borrower, newBorrowerLoans)
        }
      break
      case "LEND":
        // loan created by a lender
        const lender = loan["lender"]
        this.lenders.set(lender, true)
        // track loan in lender loans
        const lenderLoans = this.lendersLoans.get(lender)
        if (lenderLoans !== null) {
          (lenderLoans as Array<any>).push(id)
          this.borrowersLoans.set(lender, lenderLoans)
        } else {
          const newLenderLoans = new Array()
          newLenderLoans.push(id)
          this.lendersLoans.set(borrower, newLenderLoans)
        }
      break
    }

    // save loan
    this.loans.set(id, loan)

    return true
  }

  @call({ privateFunction: true })
  accept_loan({ id, lender }: { id: string, lender: string }): any {
    const timestamp = near.blockTimestamp().toString()
    const loan = this.loans.get(id)

    loan["status"] = "ACTIVE"
    loan["lender"] = lender
    loan["acceptedAt"] = timestamp

    this.lenders.set(lender, true)

    // track loan in lenders loans
    const lenderLoans = this.lendersLoans.get(lender)

    if (lenderLoans !== null) {
      (lenderLoans as Array<any>).push(id)
      this.lendersLoans.set(lender, lenderLoans)
    } else {
      const newLenderLoans = new Array()
      newLenderLoans.push(id)
      this.lendersLoans.set(lender, newLenderLoans)
    }

    // save loan
    this.loans.set(id, loan)

    near.log(`loan successfully accepted !`)

    return true
  }

  @call({ privateFunction: true })
  increase_loan_deposit({ id, amount }: { id: string, amount: string }): any {
    const loan = this.loans.get(id)
    const deposit = loan["deposit"] ? parseInt(loan["deposit"]) : 0
    const newDeposit = deposit + parseInt(amount)

    loan["deposit"] = newDeposit

    this.loans.set(id, loan)

    near.log(`deposit successfully increased !`)

    return true
  }

  @call({})
  cancel_loan({id}: { id: string }): any {
    const loan = this.loans.get(id)

    assert(loan, "loan not exists")
    assert(!loan["locked"], "loan is locked, please try again later")
    assert(near.predecessorAccountId() == loan["borrower"] || near.predecessorAccountId() == loan["lender"], "only loan creator can cancel a loan")
    assert(loan["status"] == "PENDING", "only a pending loans can be canceled")

    // lock the loan. unlock it later.
    loan["locked"] = true 
    this.loans.set(loan["id"], loan)
        
    const capital = loan["capital"]
    const currency = loan["currency"]
    const borrower = loan["borrower"]
    const lender = loan["lender"]
    const receiver = borrower || lender
    const ft = this.supportedTokens.get(currency) as string
    
    return NearPromise.new(this.escrow.toString())
    .functionCall("call_ft_transfer", bytes(JSON.stringify({ ft, to: receiver, amount: capital })), ONE_YOCTO, TWO_HUNDREDS_TGAS)
    .then(
      NearPromise.new(near.currentAccountId())
      .functionCall("callback_cancel_loan", bytes(JSON.stringify({ id, amount: capital })), NO_DEPOSIT, FIFTY_TGAS)
    )
    .asReturn()
  }

  callback_cancel_loan({ id }:{ id: string }): any { 
    let { success } = promiseResult()

    const loan = this.get_loan({ id })

    // unlock the loan.
    loan["locked"] = false 
    this.loans.set(loan["id"], loan)

    assert(success, "loan cancellation failed...")

    const borrower = loan["borrower"]
    const borrowerLoans = [];
    const borrowerLoansIds = this.borrowersLoans.get(borrower)
    for (let loanId of (borrowerLoansIds as Array<any>)) {
      if (loanId != id) borrowerLoans.push(loan)
    }

    this.borrowersLoans.set(borrower, borrowerLoans)
    this.loans.remove(id)

    near.log(`loan successfully cancelled !`)

    return true
  }

  @call({payableFunction: true})
  collect_loan_interest({ id }: { id: string }): any {
    const loan = this.loans.get(id)

    assert(loan, "loan not exists")
    assert(!loan["locked"], "loan is locked, please try again later")
    assert(near.predecessorAccountId() == loan["lender"], "only loan lender can collect loan interests")

    const loanInterest = this.get_loan_interest({ id })
    const collectable = loanInterest["collectable"]

    assert(collectable && parseInt(collectable) > 0, "no interest to collect")

    const currency = loan["currency"]
    const lender = loan["lender"]
    const ft = this.supportedTokens.get(currency) as string
    
    // lock the loan. unlock later.
    loan["locked"] = true 
    this.loans.set(loan["id"], loan)

    return NearPromise.new(this.escrow.toString())
    .functionCall("call_ft_transfer", bytes(JSON.stringify({ ft, to: lender, amount: collectable })), ONE_YOCTO, TWO_HUNDREDS_TGAS)
    .then(
      NearPromise.new(near.currentAccountId())
      .functionCall("callback_collect_loan_interest", bytes(JSON.stringify({ id, amount: collectable })), NO_DEPOSIT, FIFTY_TGAS)
    )
    .asReturn()
  }

  @call({ privateFunction: true })
  callback_collect_loan_interest({ id, amount }:{ id: string, amount: string }): any {
    let { success } = promiseResult()
    
    const loan = this.get_loan({ id })

    // unlock the loan.
    loan["locked"] = false 
    this.loans.set(loan["id"], loan)

    assert(success, "interest collection failed...")

    const collected = loan["collected"] ? loan["collected"] : "0"
    const newCollected = parseInt(collected) + parseInt(amount)
    
    loan["collected"] = newCollected.toString()
    
    this.loans.set(id, loan)

    near.log(`interest successfully collected !`)

    return amount
  }

  @call({privateFunction: true})
  callback_default({ success }: { success: boolean }): any {
    let { result, success: promiseSuccess } = promiseResult()
    near.log(`promise result : ${result}`)

    if (promiseSuccess && success) {
      near.log(`Promise succeeded !`)
    } else {
      near.log("Promise failed...")
    }

    return result
  }
}

function promiseResult(): {result: string, success: boolean}{
  let result, success;
  
  try { result = near.promiseResult(0); success = true }
  catch { result = undefined; success = false }
  
  return {result, success}
}

function assert(statement, message) {
  if (!statement) {
    throw Error(message)
  }
}