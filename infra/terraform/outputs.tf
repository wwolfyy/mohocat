output "vercel_project_id" {
  description = "The unique ID of the Vercel project"
  value       = vercel_project.mohocat.id
}

output "production_url" {
  description = "Production deployment URL"
  value       = "https://${var.production_domain}"
}

output "staging_url" {
  description = "Staging deployment URL (dev branch)"
  value       = "https://${var.staging_domain}"
}
