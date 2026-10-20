## Accessible Chart Controls

To ensure full screen-reader and keyboard navigation compliance (WCAG 2.1 AA):
- **ARIA Labeling**: All chart time-range buttons and metric toggles feature explicit descriptive `aria-label` attributes.
- **State Semantics**: Active button states are communicated to assistive technologies using `aria-pressed="true|false"`.
- **Grouping**: Control sets are wrapped in semantic `role="group"` containers with descriptive aria labels.