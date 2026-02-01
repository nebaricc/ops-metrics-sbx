# Copy to backend.YOUR_ENV.hcl and set your GCS bucket for Terraform state.
# Example: terraform init -backend-config=backend.dev.hcl
bucket = "your-project-operational-metrics-state"
prefix = "terraform/state"
