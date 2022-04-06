import * as React from "react";

/* eslint-disable @typescript-eslint/naming-convention */
const EICS_Completness = {
  name: "EICS Completness",
  formula: <div>AG(S -&gt EX(Q))</div>,
  description: (
    <div>
      It is always possible to go from S to Q in one step.
      <br />
      The pattern must be instantiated with IVALn variables so that it ranges over all possible values of the attributes
      (i.e. all possible system states).
      <br />
      S: an attrib=IVALn expression defining which attributes are relevant to the analysis
      <br />
      Q: another attrib=IVALn expression (typically with the same attributes as S, but different IVALns).
      <br />
    </div>
  ),
  intent: <div>To verify that the user can get from any state to any other state with only one action</div>,
  example: <div>To be filled.</div>,
};

const EICS_Eccentricity = {
  name: "EICS Eccentricity",
  formula: <div>AG(S -&gt !EF(Q))</div>,
  description: (
    <div>
      The notion of eccentricity is used to define the diameter and radius of the graph. This enables the identification
      of its periphery and center and is considered to be a measure of the user effort required by the interface.
      <br />
      Eccentricity is determined by the longest path between S and Q. This must be determined by inspection of the
      counterexamples produced by the analysis.
      <br />
      Q must be instantiated with IVALn variables so that it ranges over all possible values of the attributes (i.e. all
      possible system states)
      <br />
      S: an expression identifying the state whose eccentricity is of interest
      <br />
      Q: another attrib=IVALn expression (typically with the same attributes as S).
    </div>
  ),
  example: <div>To be filled</div>,
  intent: <div>To generate traces that enable determining eccentricity of states</div>,
};

const EICS_Reachability = {
  name: "EICS Reachability",
  formula: <div>AG(S -&gt EF(Q))</div>,
  description: (
    <div>
      It is always possible to go from S to Q.
      <br />
      S: an attrib=IVALn expression defining which attributes are relevant to the analysis
      <br />
      Q: another attrib=*x expression (typically with the same attributes as S, but different IVALns)
    </div>
  ),
  intent: <div>To verify that the user can get from any state to any other state.</div>,
  example: <div>To be filled</div>,
};

const BC_Guarded_Consistency = {
  name: "BC Guarded Consistency",
  formula: <div>AG((P) `{"&"}` (S) -&gt AX(Q -&gt (R)))</div>,
  description: (
    <div>
      When P, then Q always causes the R effect.
      <br />
      P: a predicate on the state characterising the subset of states of interest to the analysis
      <br />
      S: an attrib=IVALn expression defining which attributes are relevant to the analysis Note that if S only
      references attributes with an associated modality, then it is presentation consistency.
      <br />
      Q: the action whose consistency will be checked
      <br />
      R: an expression characterising the effect in the state (typically it will be defined over the attributes and
      IVALns of S)
    </div>
  ),
  intent: <div> To verify that, under the defined condition, an action causes a consistent effect.</div>,
  example: (
    <div>
      AG((on=true) `{"&"}` (ac=IVAL1) -&gt AX (action=ackey -&gt (ac!=IVAL1))) checks whether ackey toggles attribute ac
      when the system is on.
      <br />
      P: on=true
      <br />
      S: ac=IVAL1
      <br />
      Q: ackey
      <br /> R: ac!=IVAL1
    </div>
  ),
};

const BC_Consistency = {
  name: "BC Consistency",
  formula: <div> AG((S) -&gt AX(Q -&gt (R)))</div>,
  description: (
    <div>
      Q always causes the R effect.
      <br />
      S: an attrib=IVALn expression defining which attributes are relevant to the analysis Note that if S only
      references attributes with an associated modality, then it is presentation consistency.
      <br />
      Q: an action
      <br />
      R: characterises the effect in the state
    </div>
  ),
  intent: <div> To verify that an action causes a consistent effect.</div>,
  example: (
    <div>
      AG((ac=IVAL1) -&gt AX (action=ackey -&gt (ac!=IVAL1))) checks whether ackey toggles attribute ac.
      <br />
      S: ac=IVAL1
      <br />
      Q: ackey
      <br />
      R: ac!=IVAL1
    </div>
  ),
};

const Feedback_Guarded_Feedback = {
  name: "Feedback - Guarded Feedback",
  formula: <div> AG(P `{"&"}` S -&gt AX(Q -&gt !(S)))</div>,
  description: (
    <div>
      When P, then Q always provides feedback through the attributes in S.
      <br />
      P: A predicate on the state characterising the subset of states of interest to the analysis
      <br />
      S: an attrib=IVALn expression defining which attributes are relevant to the analysis Note that S should only
      reference attributes with an associated modality.
      <br />
      Q: the action
    </div>
  ),
  intent: <div> To verify that a given action provides feedback.</div>,
  example: <div>To be filled.</div>,
};

const Feedback_Feedback = {
  name: "Feedback - Feedback",
  formula: <div>AG(S -&gt AX(Q -&gt !(S)))</div>,
  description: (
    <div>
      Action Q always provides feedback through the attributes in S.
      <br />
      S: an attrib=IVALn expression defining which attributes are relevant to the analysis Note that S should only
      reference attributes with an associated modality.
      <br />
      Q: the action
    </div>
  ),
  intent: <div> To verify that a given action provides feedback.</div>,
  example: <div>To be filled.</div>,
};

export const ivyPatterns = [
  {
    name: "EICS",
    info: <div>Patterns from the EICS 2009 paper.</div>,
    patterns: [EICS_Completness, EICS_Eccentricity, EICS_Reachability],
  },
  {
    name: "BC",
    info: (
      <div>
        Consistency Specification Patterns
        <br />
        Consistency of action is a characteristic of a system that facilitates predictability and learning. This
        generalization of the Feedback pattern states that an action must always cause the same effect in the user
        interface.
        <br />
        There are two variations on the pattern:
        <br />
        * Guarded Consistency -- consistency is only checked in a subset of states defined by a guarding condition.
        <br />* (Non-guarded) Consistency -- consistency is checked for all states.
      </div>
    ),
    patterns: [BC_Consistency, BC_Guarded_Consistency],
  },
  {
    name: "FeedBack",
    info: (
      <div>
        Feedback Specification Patterns
        <br />
        Feedback is a key property of a good user interface that helps the user gain confidence in the effect of actions
        and create an appropriate mental model of the system. These patterns state that an action must cause some effect
        in the user interface.
        <br />
        There are two variations on the pattern:
        <br />
        * Guarded Feedback -- feedback is only checked in a subset of states defined by a guarding condition.
        <br />* (Non-guarded) Feedback -- feedback is checked for all states.
      </div>
    ),
    patterns: [Feedback_Feedback, Feedback_Guarded_Feedback],
  },
];
