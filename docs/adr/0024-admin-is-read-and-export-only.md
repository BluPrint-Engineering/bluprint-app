# The admin is read-and-export only on operational content

The organization admin sees every dashboard and exports any report of any project in the organization, but never creates, edits or deletes pins, and never changes pin or unit status. `admin` is absent from the effective roles by construction, which makes this structural instead of an exception in each guard.

Requirements: RF-114, RF-115, RF-116
