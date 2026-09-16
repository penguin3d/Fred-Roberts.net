@acceptance @sign-in-boundary
Feature: Only Fred can get into the portfolio, and nobody else can tell it is there

  Job: A sign-in boundary for the private half of fredroberts.net. Fred, and only Fred, signs in
    with his Google account at a secret entrance and reaches a placeholder portfolio. Everyone
    else, signed in or not, only ever sees the public site and is given no way to tell that a
    private area exists.
  Why: Every later portal story stands on this rule. Today there is no sign-in at all: the whole
    site is one public placeholder page. It goes first through the gauntlet because it has real
    logic to measure rather than content.
  Guardrails: The public site keeps working exactly as it does today for a signed-out visitor.
    The allowed account is matched on Google's stable account id, never on an email address; the
    email is a label and nothing more. There is exactly one allowed account, and if none is
    configured or the identity check cannot run then nobody gets in, Fred included: the boundary
    fails closed. Every refusal is silent: the visitor is shown the ordinary public site with no
    message, indistinguishable from asking for any wrong address. The sign-in entrance lives at
    a secret address; every other address, including near misses of the secret one, is the
    public site. What the site sends a signed-out visitor contains no trace of the portfolio,
    the entrance address, the allowed account, or the fact that an allow-list exists. Signed-in
    state belongs to one device, has no expiry of our own, and ends only when Fred signs out on
    that device. The dates in this file are literal and prove only persistence; there is no date
    arithmetic anywhere in this rule.
  Done means: Every scenario below green through the real site at stage 5 and the gates of
    stages 2 to 4 met. A sign-in entrance exists at a configured secret address, a placeholder
    portfolio sits behind it that identifies Fred as the signed-in owner, and Fred has a way to
    sign out. Fred can open the site on his phone a week after signing in on it and still be in.
    The public placeholder is unchanged for a signed-out visitor.
  Out of scope: What the portfolio contains. Accounts for anyone other than Fred. Email-and-
    password sign-in. The public vanity page itself. Signing out of every device at once.
    Any session expiry of our own. Rotating the entrance address. No follow-up card exists yet
    for any of these.

  Rule: Anyone who is not Fred is shown the public site, and nothing hints that anything else exists

    Background:
      Given the only allowed Google account is Fred's, identified by its Google account id
      And "Fred" holds the allowed Google account
      And "Sam" holds a Google account of their own
      And "Sam" is not signed in

    Scenario: A signed-out visitor who asks for the portfolio is shown the public site
      When "Sam" asks for the portfolio
      Then "Sam" is shown the public site
      And "Sam" is not signed in

    Scenario: A signed-out visitor who asks for the portfolio is given no hint that a private area exists
      When "Sam" asks for the portfolio
      Then nothing "Sam" was shown mentions a portfolio, a sign-in, or a refusal

    Scenario: Nothing on the public site leads to the sign-in entrance
      When "Sam" looks over the public site for a way to sign in
      Then "Sam" finds no way to sign in

    Scenario: What the site sends a signed-out visitor carries no trace of the private area
      When "Sam" inspects everything the site sent them
      Then nothing the site sent "Sam" contains any trace of the portfolio, the sign-in entrance, or the allowed account

    Scenario: A common guess at a private address is shown the public site
      When "Sam" asks for an address that is not the sign-in entrance
      Then "Sam" is shown the public site
      And nothing "Sam" was shown mentions a portfolio, a sign-in, or a refusal

    Scenario Outline: A near miss on the entrance address is shown the public site
      When "Sam" asks for the sign-in entrance with "<difference>"
      Then "Sam" is shown the public site
      And nothing "Sam" was shown mentions a portfolio, a sign-in, or a refusal

      Examples:
        | difference                |
        | a different letter case   |
        | a trailing slash added    |
        | an extra segment appended |

    Scenario: Someone who knows the exact entrance address is offered a Google sign-in and nothing more
      When "Sam" asks for the sign-in entrance
      Then "Sam" is offered a Google sign-in and nothing else
      And nothing "Sam" was shown mentions a portfolio, a sign-in, or a refusal

    Scenario: Fred being signed in on one device opens nothing to anyone else
      Given "Fred" is signed in on their "laptop"
      When "Sam" asks for the portfolio
      Then "Sam" is shown the public site
      And "Sam" is not signed in

  Rule: Only the allowed account, matched by its Google account id, gets in

    Background:
      Given the only allowed Google account is Fred's, identified by its Google account id
      And "Fred" holds the allowed Google account
      And "Sam" holds a Google account of their own

    Scenario: The site owner signs in with the allowed account and lands in the portfolio
      Given "Fred" is not signed in
      When "Fred" signs in at the sign-in entrance
      Then "Fred" is shown the portfolio
      And the portfolio identifies "Fred" as the signed-in owner

    Scenario: The signed-in owner who asks for the portfolio is shown it
      Given "Fred" is signed in
      When "Fred" asks for the portfolio
      Then "Fred" is shown the portfolio
      And the portfolio identifies "Fred" as the signed-in owner

    Scenario: A visitor who signs in with any other Google account is silently shown the public site
      Given "Sam" is not signed in
      When "Sam" signs in at the sign-in entrance
      Then "Sam" is not signed in
      And "Sam" is shown the public site
      And nothing "Sam" was shown mentions a portfolio, a sign-in, or a refusal

    Scenario: An account that merely shows the owner's email address is not the allowed account
      Given "Sam" holds a Google account that shows Fred's email address but is not Fred's account
      And "Sam" is not signed in
      When "Sam" signs in at the sign-in entrance
      Then "Sam" is not signed in
      And "Sam" is shown the public site

    Scenario: The owner still gets in after the email address on their Google account changes
      Given Fred's Google account now shows a different email address
      And "Fred" is not signed in
      When "Fred" signs in at the sign-in entrance
      Then "Fred" is shown the portfolio
      And the portfolio identifies "Fred" as the signed-in owner

    Scenario: A sign-in that does not complete leaves the visitor signed out on the public site
      Given "Fred" is not signed in
      When "Fred" starts signing in at the sign-in entrance but does not complete it
      Then "Fred" is not signed in
      And "Fred" is shown the public site

    Scenario: The owner who is already signed in and asks for the entrance is shown the portfolio, not a prompt
      Given "Fred" is signed in
      When "Fred" asks for the sign-in entrance
      Then "Fred" is shown the portfolio
      And "Fred" is not asked to sign in

  Rule: Signed-in state lasts until sign-out, on that device alone

    Background:
      Given the only allowed Google account is Fred's, identified by its Google account id
      And "Fred" holds the allowed Google account

    Scenario Outline: The site owner is still signed in when they come back later
      Given "Fred" signed in on 2026-09-16 and has not signed out
      When "Fred" asks for the portfolio on <date>
      Then "Fred" is shown the portfolio
      And "Fred" is not asked to sign in

      Examples:
        | date       |
        | 2026-09-17 |
        | 2026-09-23 |
        | 2026-10-16 |

    Scenario: After signing out, the portfolio is out of reach again
      Given "Fred" is signed in
      And "Fred" has signed out
      When "Fred" asks for the portfolio
      Then "Fred" is shown the public site
      And "Fred" is not signed in

    Scenario: After signing out, the entrance offers sign-in again rather than the portfolio
      Given "Fred" is signed in
      And "Fred" has signed out
      When "Fred" asks for the sign-in entrance
      Then "Fred" is offered a Google sign-in and nothing else

    Scenario: Signing out on one device leaves another device signed in
      Given "Fred" is signed in on their "laptop"
      And "Fred" is signed in on their "phone"
      When "Fred" signs out on their "laptop"
      Then "Fred" is not signed in on their "laptop"
      And "Fred" is still signed in on their "phone"

    Scenario: Signing out when already signed out changes nothing
      Given "Fred" is not signed in
      When "Fred" signs out
      Then "Fred" is not signed in
      And "Fred" is shown the public site

  Rule: A check that cannot run lets nobody in

    Scenario: With no allowed account configured, even the owner's sign-in is refused
      Given no allowed Google account is configured
      And "Fred" holds the allowed Google account
      And "Fred" is not signed in
      When "Fred" signs in at the sign-in entrance
      Then "Fred" is not signed in
      And "Fred" is shown the public site

    Scenario: When the identity check is unavailable, even the owner's sign-in is refused
      Given the only allowed Google account is Fred's, identified by its Google account id
      And "Fred" holds the allowed Google account
      And the identity check is unavailable
      And "Fred" is not signed in
      When "Fred" signs in at the sign-in entrance
      Then "Fred" is not signed in
      And "Fred" is shown the public site

    Scenario: When the identity check is unavailable, a signed-in owner is shown the public site
      Given the only allowed Google account is Fred's, identified by its Google account id
      And "Fred" holds the allowed Google account
      And "Fred" is signed in
      And the identity check is unavailable
      When "Fred" asks for the portfolio
      Then "Fred" is shown the public site
