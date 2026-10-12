# PolyTSL — parameter-efficient text-conditioned polymer generation

**Context:** Graph Learning and Network Analysis REU, June–August 2026.
First-author manuscript draft; not presented as a peer-reviewed publication.

## Problem and approach

PolyTSL explores whether a small trainable adapter can condition a frozen
polymer generator on a frozen text encoder's representation:

```text
Polymer description → frozen Text+ChemT5 → trainable adapter → frozen MolGPT → PSMILES
```

The cross-attention adapter has **592,768 trainable parameters**. This isolates
the learned bridge while keeping the large upstream models frozen.

## Evaluation design

- 13,020 description–structure records across 735 polymer graphs.
- Graph-first training/validation/test split to avoid placing descriptions
  of the same graph on both sides of an adapter-training split.
- A controlled benchmark of 89 graph-disjoint targets, across five seeds.
- A parameter-matched pooled MLP baseline and retrieval baselines.
- Shuffled, mismatched and neutral text conditions, plus a gate-off control,
  to test whether outputs actually depend on text conditioning.

## What the evidence supports

The controlled results support text-sensitive conditioning relative to the
no-text and perturbation controls. They do **not** establish a statistically
significant advantage over the pooled MLP, exact repeat-unit recovery,
external state-of-the-art performance, or broad free-form understanding of
polymer language. Retrieval remains an important baseline.

This distinction is central to the project: a model can respond to text
without proving accurate structural recovery or superiority to simpler models.

## Reproducibility and access

The internal workspace preserves data provenance, frozen splits, per-record
outputs, seeded evaluation, hashes and reproduction scripts. Recomputing
archived metrics is distinct from regenerating all model outputs, which also
requires upstream models and compute.

This page summarizes the project; it does not independently reproduce the
private experiments. Source, data, checkpoints and manuscript assets remain
private while upstream redistribution and data-release decisions are resolved.
No restricted research assets are bundled in this public profile.
