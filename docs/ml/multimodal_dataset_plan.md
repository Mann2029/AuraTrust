# Multimodal CustomCNN Dataset Plan

## Recommended datasets

The multimodal model should not treat several copies of the same face dataset as
separate modalities. Each modality needs labels that represent the signal it is
supposed to learn.

### 1. CelebA — primary face/attribute/landmark dataset

- Official TensorFlow Datasets documentation:
  https://www.tensorflow.org/datasets/catalog/celeb_a
- 202,599 images and 10,177 identities.
- 40 binary facial attributes per image.
- Five facial landmarks per image.
- Useful for the image branch, identity supervision, landmark/pose-related features,
  and attribute-aware quality variation.
- This is a public research dataset with its own terms. It must be reviewed before
  redistribution or production use.

CelebA is a better general-purpose development dataset than LFW for this model
because it has substantially more images, identity labels, attributes, and
landmarks. It still does **not** provide real liveness labels or AuraTrust
attendance telemetry.

### 2. Replay-Attack or OULU-NPU — liveness/presentation-attack dataset

Use one institutionally licensed presentation-attack dataset for the liveness
branch. These datasets generally require registration or an access request rather
than unrestricted scripted downloading:

- Replay-Attack: https://www.idiap.ch/en/scientific-research/data/replayattack
- OULU-NPU publication/project references:
  https://sites.google.com/site/oulunpudatabase/

These datasets provide bona-fide versus attack examples such as printed-photo,
replay-screen, or mask attacks. They are required if the model is expected to
learn real anti-spoofing behavior. LFW/CelebA cannot substitute for them.

### 3. AuraTrust project dataset — production calibration

Collect a separate, consented dataset from the real deployment camera and
environment. It should contain:

- multiple genuine captures per enrolled person;
- lighting, pose, distance, glasses, and expression variation;
- real quality/liveness measurements from the production pipeline;
- genuine and impostor verification pairs;
- failed scans and permitted presentation-attack samples;
- a subject-disjoint calibration/test split.

This dataset is mandatory before enabling attendance decisions. Public celebrity
datasets must not be used as the student attendance registry.

## Training composition

| Model input branch | Dataset supervision |
|---|---|
| Face image and identity embedding | CelebA during development; AuraTrust captures for production calibration |
| Landmarks/pose and attributes | CelebA landmarks and attributes |
| Liveness/attack score | Replay-Attack or OULU-NPU |
| Quality and attendance telemetry | AuraTrust project captures |

The datasets should not be blindly concatenated. Train each auxiliary head with
the labels it actually has, then fuse the learned features. Keep subject identities
disjoint across train, validation, and test sets.

## Current repository state

- LFW remains downloaded under `data/lfw` for the already-completed benchmark.
- CelebA has been identified as the recommended next development dataset but has
  not been downloaded automatically because its distribution terms require review
  and the TensorFlow Datasets downloader conflicts with this project's pinned
  TensorFlow 2.10/protobuf 3.19 environment.
- No anti-spoof dataset is bundled because Replay-Attack/OULU-NPU access and terms
  must be accepted by the dataset provider.
- The current multimodal CustomCNN checkpoint is therefore a development artifact,
  not production attendance authorization.

