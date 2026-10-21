import { Download, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
  useGetLegacyBlockInfo,
  useTechnicalDetails,
} from "../hooks/useQueries";
import {
  BUYER_PRICE_LABEL,
  CYCLES_FEE_LABEL,
  CYCLES_FEE_TEXT,
  MIN_PURCHASE,
  MIN_PURCHASE_LABEL,
  TOKEN_PRICE_LABEL,
  TTTI_DECIMALS,
  encodeAccountText,
  formatUnits,
} from "../lib/token";

const originalDocument = "/assets/ttti-white-paper-original.docx";
const originalFilename = "ttti-white-paper-original.docx";

// Transcribed paragraph-by-paragraph from the supplied DOCX, in document order.
// Prefixes describe Word paragraph styles; the words after each prefix are unchanged.
const original = `H1|TTTI — The 10,000 Immortals
P|Oct 16, 2026
H2|Read this first
P|TTTI is a meme coin. It has no use, no intrinsic value and no backing of any kind.
L|No rights. Holding TTTI gives you no claim on anything: no share, no revenue, no vote, no access, no claim on the creator or on any of his other projects.
L|No value. The price of TTTI, if it ever has one, depends only on what someone else is willing to pay for it. It can fall to zero. Nobody supports the price, and nobody will buy it back.
L|No promise. Nobody promises a return, a listing, a roadmap or a future. Nothing in this document should be read as one.
L|High volatility. If TTTI trades at all, expect violent swings and the possibility of no buyer at any price.
L|Your money goes to the creator. The ICP you pay to mint TTTI is transferred to the creator. It is his to use as he wishes. It is not held in reserve for you.
L|Only spend what you can lose entirely. If losing every cent you put in would hurt you, do not buy.
P|By minting TTTI you confirm that you have read this section and understand it.
H2|The Immortals
P|In 480 BC, the largest army the world had seen marched on Greece. At its core stood the Immortals: ten thousand elite soldiers of the Persian king.
P|Herodotus tells us why they bore the name. Their number never changed. When one fell, another stepped in at once, and the corps stood at ten thousand, always. Not one more, not one less. A mass that renewed itself and never had to become anything else.
P|Persia had asked the Greek cities for earth and water, the tokens of submission. Sparta refused. So the empire came, and at the pass of Thermopylae it met three hundred.
P|The Immortals were sent to crush them. They broke against the pass. Their number did not matter, because the three hundred did not fight on the empire's terms. A small force, well placed, held the narrow ground where size meant nothing.
P|The three hundred fell in the end. But they held long enough to change what came after, and Greece won the war.
P|TTTI is the ten thousand. THAT is the three hundred.
P|TTTI is the provocation: the empire's answer to everything, a fixed mass of identical units that exists to be bought and does nothing else. THAT is the defense, and the example for what comes after. The Immortals are not the heroes of this story. They are the reason the story is told.
H2|What TTTI is
P|TTTI is good money that is not intelligent. It is cryptographic laziness, and it is honest about it.
P|As money, it works:
L|It transfers fast, securely and for very little.
L|Its supply is fixed and public. Nobody can print more.
L|Nobody can freeze it, confiscate it or change its rules after the fact.
P|And that is all it does. It does not decide who receives new money, or why. It does not reward anyone for building anything. It does not protect anyone from anyone. It solves almost nothing.
P|This is the architecture most of crypto still runs on: create units, sell them, let the price wander. A new name on the old model. The technology underneath can do far more, and almost nobody asks it to.
P|TTTI asks nothing of it, on purpose. Look at it closely, then look at what the three hundred do instead.
H2|Mechanics
P|TTTI exists only when someone buys it. Nothing was minted in advance, and the total can never exceed 10,000 tokens.
P|Buy to mint is how TTTI is born. There is no stock of tokens waiting to be sold. Every TTTI comes into existence at the moment someone pays for it, the way a Bitcoin block comes into existence when a miner spends the energy to produce it. Minting is not buying an existing coin from someone. It is the creation of the coin itself.
P|The analogy has one honest limit. A miner pays an electricity company; a TTTI minter pays the creator. The cost of creation goes to him, not to a third party.
P|When you pay, the contract mints exactly what you paid for and sends it to you. Nothing is held back for anyone.
P|Priced in dollars, paid in ICP. An oracle reads the ICP/USD rate at the moment of purchase and sets how much TTTI one ICP mints. The price per unit stays at 1 USD; only the amount of ICP it takes changes.
P|The cap is final. Once 10,000 TTTI exist, minting stops forever. If the cap is never reached, the supply stays at whatever was bought.
H3|Contract specification
P|Every value below is read from the deployed contract and can be checked on-chain.
H2|TTTI-T: the test
P|TTTI-T is a test of one single token: 10,000 units at 1 USD each, 10,000 USD at most. It exists to see whether anyone wants the Immortals at all.
L|TTTI-T is a test, not a presale. It was minted at the same price as any later TTTI, 1 USD per unit, so it carries no discount, no bonus and no advantage.
L|There may never be a later release. If the test ends here, TTTI-T stays what it is: a meme coin with no value.
L|If a full TTTI release ever happens, each unit of TTTI-T converts into one unit of TTTI, 1 for 1, nothing more. The TTTI-T token is the first of the 10,000 Immortals and counts against the cap: a full release could mint at most 9,999 more.
H2|Creator disclosures
P|TTTI and THAT have the same creator.
L|No free tokens. The creator received no TTTI at creation. Any TTTI he holds, he minted at the same price as everyone else.
L|Holdings: at launch, the creator holds no TTTI-T. Any later holding will be published here.
L|No price support. The creator does not buy back TTTI, defend a price or trade to create volume.
L|No mechanical link to THAT. TTTI cannot be exchanged for THAT, used inside THAT, or converted into anything else. The rivalry between them is a story, not a feature. The success or failure of THAT gives TTTI holders nothing.
L|Liquidity: the creator will not open a liquidity pool or list TTTI on any exchange. Any market that exists is created by holders.
H2|Trading TTTI
P|The creator will not list TTTI anywhere. If holders want it to trade, they list it themselves. If nobody does, it will not trade.
P|Any holder can open a market on a decentralized exchange (DEX) on ICP. A centralized exchange (CEX) decides for itself what it lists; holders can only ask.
H3|A short course on market making
P|A DEX market is a liquidity pool: a smart contract holding two assets side by side, for example TTTI and ICP. Whoever deposits them is a liquidity provider.
L|The ratio is the price. A pool holding 1 TTTI and 2,000 ICP prices 1 TTTI at 2,000 ICP. The first depositor sets the opening price simply by choosing the ratio.
L|Every trade moves the price. Buying TTTI from the pool removes TTTI and adds ICP, so the next TTTI costs more. Selling does the reverse. The smaller the pool, the more each trade moves it.
L|Providers earn fees. Each trade pays a small fee to the providers, in proportion to their share of the pool.
L|Providers carry the risk. When the price moves, the pool rebalances automatically, and providers end up holding more of whichever asset lost value. This is called impermanent loss, and it becomes permanent the moment they withdraw.
L|A pool can be emptied. If everyone sells TTTI into it, providers are left holding TTTI and little else. If TTTI goes to zero, so does their share.
L|Never trade with yourself. Buying and selling your own position to create volume is market manipulation. It fools other people into thinking there is demand.
P|Providing liquidity is not a way to earn safely. It is a way to make a market possible, at your own risk.
H2|Infrastructure: the Internet Computer
P|TTTI runs as a smart contract, called a canister, on the Internet Computer (ICP).
L|Canisters hold code and state on-chain. The minting logic, the cap and the ledger all live in the contract itself, not on a server someone controls.
L|Reverse gas model. The canister pays for its own computation in cycles. Buyers pay only the TTTI price and standard ICP transfer fees.
L|Fast finality. Transfers settle in seconds.
L|Chain-key cryptography. The network signs with threshold keys held across nodes, which lets canisters read external data such as the ICP/USD rate and interact with other chains without a central bridge.
P|The same network hosts THAT, which is why the two can stand side by side and be compared directly.
H2|Terms of acquisition
P|Before minting, every buyer confirms each of the following on the mint page. The mint button stays locked until all are ticked.
L|I have read the section "Read this first" of this document.
L|I understand that TTTI has no use, no intrinsic value and gives me no rights of any kind.
L|I understand that its price can fall to zero and that nobody will support it or buy it back.
L|I understand that the ICP I pay goes to the creator, who may use it as he wishes.
L|I am not relying on any promise of profit, from the creator or from anyone.
L|I am spending only what I can afford to lose entirely.
P|TTTI is provided as is. To the extent permitted by law, the creator accepts no liability for losses arising from its purchase, holding or transfer. Nothing in this document is financial, legal or tax advice.`;

const originalParagraphs = original.split("\n").map((line, index) => ({
  kind: line.slice(0, line.indexOf("|")),
  text: line.slice(line.indexOf("|") + 1),
  position: index + 1,
}));

const contents = [
  { id: "reading-notice", label: "Read this first" },
  { id: "present-ledger", label: "Token & supply" },
  { id: "purchase-mechanics", label: "Purchase mechanics" },
  { id: "controls-risk", label: "Controls & risk" },
  { id: "creator-disclosures", label: "Creator disclosures" },
  { id: "privacy", label: "Privacy" },
  { id: "verification", label: "Verification" },
];

/** Maximum supply of the future TTTI version. */
const FUTURE_MAX_LABEL = "10,000";
/** TOKEN_MAX_SUPPLY in base units (1 TTTI-T), used until the canister answers. */
const TEST_MAX_SUPPLY = 100_000_000n;

function formatFetchedAt(timestamp: bigint | undefined): string {
  if (timestamp === undefined) return "Not yet read";
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? "Not yet read" : date.toUTCString();
}

export function WhitePaperPage() {
  const [edition, setEdition] = useState<"corrected" | "original">("corrected");
  const technicalDetails = useTechnicalDetails();
  const legacyInfo = useGetLegacyBlockInfo();
  const details = technicalDetails.data;
  const reserveAccount = details
    ? encodeAccountText(details.cyclesReserveAccount)
    : null;
  const decimals = details?.decimals ?? TTTI_DECIMALS;
  const maxSupply = details?.maxSupply ?? TEST_MAX_SUPPLY;
  const maxSupplyLabel = formatUnits(maxSupply, decimals, 0);
  const legacyBoundary =
    details?.legacyBlockBoundary ?? legacyInfo.data?.boundaryIndex ?? null;
  const pending = technicalDetails.isError ? "Could not be loaded" : "Loading…";
  const canisterRows = [
    {
      label: "Canister ID",
      value: details ? details.ledgerCanisterId.toText() : pending,
    },
    {
      label: "Controllers",
      value: details
        ? details.controllers && details.controllers.length > 0
          ? details.controllers.map((p) => p.toText()).join(", ")
          : "Not yet read"
        : pending,
    },
    {
      label: "Module hash",
      value: details ? (details.moduleHash ?? "Not yet read") : pending,
    },
    {
      label: "Read at",
      value: details ? formatFetchedAt(details.canisterInfoFetchedAt) : pending,
    },
  ];

  return (
    <section className="mx-auto max-w-6xl pb-12" data-ocid="white_paper.page">
      <header className="mb-12 border-b border-border pb-10 text-center md:mb-14">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Documents / White Paper
        </p>
        <h1 className="font-display text-4xl leading-tight text-foreground md:text-6xl">
          The Ten Thousand Immortals
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          The supplied original, preserved alongside a separate edition aligned
          with the current application source.
        </p>
      </header>

      <div className="mb-8 flex flex-col gap-5 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 font-display text-lg text-foreground">
            White Paper Editions
          </p>
          <div
            role="tablist"
            aria-label="White paper edition"
            className="flex flex-wrap gap-2"
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                return;
              event.preventDefault();
              const next = edition === "corrected" ? "original" : "corrected";
              setEdition(next);
              event.currentTarget
                .querySelector<HTMLButtonElement>(`#${next}-tab`)
                ?.focus();
            }}
          >
            <button
              type="button"
              role="tab"
              id="corrected-tab"
              aria-controls="corrected-panel"
              aria-selected={edition === "corrected"}
              onClick={() => setEdition("corrected")}
              className={`min-h-11 rounded-md px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${edition === "corrected" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              data-ocid="white_paper.corrected.tab"
            >
              Corrected edition · current source
            </button>
            <button
              type="button"
              role="tab"
              id="original-tab"
              aria-controls="original-panel"
              aria-selected={edition === "original"}
              onClick={() => setEdition("original")}
              className={`min-h-11 rounded-md px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${edition === "original" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              data-ocid="white_paper.original.tab"
            >
              Original · archival
            </button>
          </div>
        </div>
        <a
          href={originalDocument}
          download={originalFilename}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-ocid="white_paper.download.link"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download exact original DOCX
        </a>
      </div>

      {edition === "corrected" ? (
        <div
          id="corrected-panel"
          role="tabpanel"
          aria-labelledby="corrected-tab"
          data-ocid="white_paper.corrected.panel"
        >
          <div className="token-identity-note mb-9 max-w-3xl px-5 py-4 text-sm leading-relaxed">
            <strong className="block font-medium uppercase tracking-[0.1em] text-primary">
              Identity of this edition
            </strong>
            The ledger name and symbol are both <strong>TTTI-T</strong>, the
            live test. TTTI is the future version. Older transactions may use an
            earlier decimal encoding.
          </div>
          <div className="grid items-start gap-8 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-12">
            <nav
              aria-label="Corrected edition contents"
              className="lg:sticky lg:top-24"
            >
              <p className="mb-3 border-b border-border pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Contents
              </p>
              <ol className="space-y-1 text-sm">
                {contents.map((item, index) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block rounded-sm py-2 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      data-ocid={`white_paper.contents.link.${index + 1}`}
                    >
                      <span className="mr-2 text-primary">0{index + 1} /</span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <article className="paper-sheet min-w-0 px-6 py-8 shadow-lg shadow-background/20 sm:px-10 md:px-14 md:py-14">
              <div className="paper-prose mx-auto space-y-9">
                <section
                  id="reading-notice"
                  className="scroll-mt-24 space-y-4"
                  aria-labelledby="reading-title"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                    Corrected edition / source-aligned
                  </p>
                  <h2
                    id="reading-title"
                    className="font-display text-3xl md:text-4xl"
                  >
                    01 / Read this first
                  </h2>
                  <p>
                    TTTI is a speculative meme token, not a claim on a business
                    or a promise of profit. It has no intrinsic value, backing,
                    revenue rights or guaranteed market. Its market price, if
                    any, can fall to zero. Do not buy with money you cannot
                    afford to lose entirely.
                  </p>
                  <p>
                    This edition explains what the current application source
                    implements. It is not proof of a particular deployment, an
                    independent audit, a live account balance or a guarantee
                    that a purchase can be completed now.
                  </p>
                </section>
                <section
                  id="present-ledger"
                  className="scroll-mt-24 space-y-4 border-t paper-rule pt-9"
                  aria-labelledby="ledger-title"
                >
                  <h2 id="ledger-title" className="font-display text-3xl">
                    02 / Token &amp; supply
                  </h2>
                  <p>
                    TTTI is the future version, with a maximum of{" "}
                    <strong>{FUTURE_MAX_LABEL} TTTI</strong>. TTTI-T is the live
                    test, with a maximum of{" "}
                    <strong>{maxSupplyLabel} TTTI-T</strong>. Every ledger value
                    on this page is shown in TTTI-T.
                  </p>
                  <p data-ocid="white_paper.cap.text">
                    There are never more than 10,000 TTTI. Tokens cannot be
                    burned. Once the cap is reached, minting stops for good;
                    transfer fees collected by the contract are issued again
                    against ICP: when one falls, another takes his place.
                  </p>
                  <p data-ocid="white_paper.cap_test.text">
                    There are never more than {maxSupplyLabel} TTTI-T. Tokens
                    cannot be burned. Once the cap is reached, minting stops for
                    good; transfer fees collected by the contract are issued
                    again against ICP: when one falls, another takes his place.
                  </p>
                  <p>
                    The current ledger code uses{" "}
                    <strong>{decimals} decimal places</strong>: one TTTI-T is{" "}
                    {(10n ** BigInt(decimals)).toLocaleString("en-US")} base
                    units. The implemented maximum is{" "}
                    <strong>{maxSupplyLabel} TTTI-T</strong> (
                    {maxSupply.toLocaleString("en-US")} base units). A maximum
                    is not a statement of circulating or minted supply.
                  </p>
                  <p>
                    The purchase price in code is{" "}
                    <strong>{TOKEN_PRICE_LABEL} per TTTI-T</strong> plus a{" "}
                    <strong>fixed {CYCLES_FEE_LABEL} fee</strong>, both paid in
                    ICP: {BUYER_PRICE_LABEL} per TTTI-T in total. The minimum
                    ordinary purchase is{" "}
                    <strong>
                      {formatUnits(MIN_PURCHASE, TTTI_DECIMALS, 0)} TTTI-T
                    </strong>{" "}
                    ({MIN_PURCHASE.toLocaleString("en-US")} base units) ={" "}
                    <strong>{MIN_PURCHASE_LABEL}</strong> including the fee. A
                    smaller purchase is accepted only when it takes everything
                    that remains available.
                  </p>
                  <p data-ocid="white_paper.cycles_fee.text">
                    {CYCLES_FEE_TEXT}
                  </p>
                  <div
                    className="border-l paper-rule pl-5"
                    data-ocid="white_paper.cycles_reserve.panel"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                      Cycles reserve account
                    </p>
                    {reserveAccount ? (
                      <p className="mt-1 break-all font-mono text-sm">
                        {reserveAccount}
                      </p>
                    ) : technicalDetails.isError ? (
                      <p
                        className="mt-1 text-sm"
                        data-ocid="white_paper.cycles_reserve.error_state"
                      >
                        The reserve account could not be loaded. It is listed
                        under Technical details.
                      </p>
                    ) : (
                      <p
                        className="mt-1 text-sm"
                        data-ocid="white_paper.cycles_reserve.loading_state"
                      >
                        Loading reserve account…
                      </p>
                    )}
                  </div>
                  <p data-ocid="white_paper.legacy_blocks.text">
                    This ledger continues earlier test versions of the contract.
                    Blocks before index{" "}
                    <strong className="font-mono">
                      {legacyBoundary === null
                        ? "…"
                        : legacyBoundary.toLocaleString("en-US")}
                    </strong>{" "}
                    come from those versions and use 4 decimals; the earliest
                    record amounts without accounts. Historical blocks from
                    before the ledger change can encode amounts using{" "}
                    <strong>4 decimals</strong>; their amounts must be
                    interpreted according to their block index, not today's
                    8-decimal setting.
                  </p>
                </section>
                <section
                  id="purchase-mechanics"
                  className="scroll-mt-24 space-y-4 border-t paper-rule pt-9"
                  aria-labelledby="mechanics-title"
                >
                  <h2 id="mechanics-title" className="font-display text-3xl">
                    03 / Purchase mechanics
                  </h2>
                  <p>
                    Tokens are created only by purchases paid in ICP, up to the{" "}
                    {maxSupplyLabel} TTTI-T maximum. No one, administrators
                    included, has a separate mint operation. Each purchase mints
                    new tokens first; transfer fees collected in the fee account
                    are delivered to buyers only after fresh minting has reached
                    the cap.
                  </p>
                  <p>
                    The ICP/USD rate is set once an hour from Coinbase, or from
                    CoinGecko if Coinbase is unavailable, and applies to every
                    purchase in that hour. If no valid rate exists, the purchase
                    is refused and no ICP is taken. There is no fallback rate
                    and no margin. The ICP amount for a given number of tokens
                    therefore depends on the rate in force. Only the ICP cost of
                    the tokens actually delivered is collected; ICP above that
                    amount is not taken from the buyer. Purchases can be paused,
                    the ICP receiving account may be unconfigured, and
                    ICP-ledger operations may fail.
                  </p>
                  <p>
                    After ICP collection, delivery can fail; the code then
                    refunds the ICP minus the 0.0001 ICP ledger fee, and the
                    refund itself can fail. Each delivered purchase sends its
                    fee share (cost × 100 / 10,100, rounded down) to the cycles
                    reserve and the rest to the treasury account; a failed
                    forward is retried automatically. The recipient and
                    subsequent use of funds are not verified here. Review the
                    current quote and transaction before approving any payment.
                  </p>
                </section>
                <section
                  id="controls-risk"
                  className="scroll-mt-24 space-y-4 border-t paper-rule pt-9"
                  aria-labelledby="controls-title"
                >
                  <h2 id="controls-title" className="font-display text-3xl">
                    04 / Controls &amp; risk
                  </h2>
                  <p>
                    Administrators cannot mint tokens and cannot freeze
                    transfers. The TTTI-T transfer-fee collector account cannot
                    be withdrawn. For the 1% ICP fee: {CYCLES_FEE_TEXT} The code
                    also lets administrators pause or resume sales, set the
                    treasury account that receives ICP, and export a balance
                    snapshot. The ledger transfer fee can be changed within
                    fixed bounds only in this test (TTTI-T) version. Tokens
                    cannot be burned. Transfers to the contract's own address
                    are refused. Ledger transactions carry the current transfer
                    fee.
                  </p>
                  <p data-ocid="white_paper.upgrade.text">
                    This canister can be upgraded by its controllers. The
                    guarantees on this page describe the current code,
                    identified by its module hash.
                  </p>
                  <p>
                    Holding the token grants no voting, revenue, redemption or
                    guaranteed liquidity. A listing, secondary market, buyback
                    or later full release is{" "}
                    <strong>not a present entitlement</strong>. Aspirations in
                    the archival original are not verified current features or
                    commitments. A secondary market, if one appears, may be
                    illiquid and highly volatile.
                  </p>
                </section>
                <section
                  id="creator-disclosures"
                  className="scroll-mt-24 space-y-4 border-t paper-rule pt-9"
                  aria-labelledby="disclosures-title"
                >
                  <h2 id="disclosures-title" className="font-display text-3xl">
                    05 / Creator disclosures
                  </h2>
                  <p>
                    The creator will not open a liquidity pool or list TTTI on
                    any other exchange. Any market that exists is created by
                    holders.
                  </p>
                </section>
                <section
                  id="privacy"
                  className="scroll-mt-24 space-y-4 border-t paper-rule pt-9"
                  aria-labelledby="privacy-title"
                >
                  <h2 id="privacy-title" className="font-display text-3xl">
                    06 / Privacy
                  </h2>
                  <p data-ocid="white_paper.privacy.text">
                    Every purchase and transfer is recorded publicly and
                    permanently on the ICP and TTTI-T ledgers. Anyone can see
                    the amounts, the accounts and the times. Beyond that, the
                    app keeps only your purchase records, your delivery address
                    and the date you accepted the purchase terms.
                  </p>
                </section>
                <section
                  id="verification"
                  className="scroll-mt-24 space-y-4 border-t paper-rule pt-9"
                  aria-labelledby="verification-title"
                >
                  <h2 id="verification-title" className="font-display text-3xl">
                    07 / Verification
                  </h2>
                  <p>
                    The canister ID, controllers and module hash are read from
                    the canister and listed under Technical details on the home
                    page. The values in force are:
                  </p>
                  <dl
                    className="space-y-3 border-l paper-rule pl-5 text-sm"
                    data-ocid="white_paper.canister_info.panel"
                  >
                    {canisterRows.map((row) => (
                      <div key={row.label}>
                        <dt className="text-xs font-semibold uppercase tracking-[0.16em]">
                          {row.label}
                        </dt>
                        <dd className="mt-1 break-all font-mono">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p>
                    Current balances, supply, fee, sale remaining and status
                    should be read from the running ledger and sale before
                    acting; no fixed snapshot is asserted on this page.
                  </p>
                  <p>
                    Read the unaltered original separately to understand the
                    original claims and their context. Where its mechanics,
                    price, promises or controls differ from current code, use
                    this corrected edition to understand the code—not as a
                    substitute for checking the deployed application yourself.
                  </p>
                </section>
              </div>
            </article>
          </div>
        </div>
      ) : (
        <div
          id="original-panel"
          role="tabpanel"
          aria-labelledby="original-tab"
          data-ocid="white_paper.original.panel"
        >
          <p
            className="token-identity-note mb-4 max-w-3xl px-5 py-4 text-sm leading-relaxed"
            data-ocid="white_paper.archive_notice.text"
          >
            Archived original. Some statements no longer match the code; the
            current edition is authoritative.
          </p>
          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Archival transcription of the supplied document, in full and in its
            original order. Its claims have not been silently updated. The
            supplied DOCX is available above for exact formatting and source
            comparison. For current-code corrections, select the corrected
            edition.
          </p>
          <article className="paper-sheet mx-auto max-w-3xl px-6 py-8 sm:px-10 md:px-14 md:py-14">
            <div className="paper-prose mx-auto space-y-4">
              {originalParagraphs.map(({ kind, text, position }) => {
                if (kind === "H1")
                  return (
                    <h2
                      key={position}
                      className="font-display text-3xl md:text-4xl"
                    >
                      {text}
                    </h2>
                  );
                if (kind === "H2")
                  return (
                    <h3
                      key={position}
                      className="!mt-12 border-t paper-rule pt-8 font-display text-2xl"
                    >
                      {text}
                    </h3>
                  );
                if (kind === "H3")
                  return (
                    <h4 key={position} className="!mt-8 font-display text-xl">
                      {text}
                    </h4>
                  );
                if (kind === "L")
                  return (
                    <p key={position} className="border-l paper-rule pl-5">
                      {text}
                    </p>
                  );
                return <p key={position}>{text}</p>;
              })}
            </div>
          </article>
          <a
            href={originalDocument}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto mt-6 flex w-fit min-h-11 items-center gap-2 text-sm text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-ocid="white_paper.open_original.link"
          >
            Open original DOCX{" "}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      )}
    </section>
  );
}
