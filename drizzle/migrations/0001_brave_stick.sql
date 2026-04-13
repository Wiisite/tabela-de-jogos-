ALTER TABLE `portals` MODIFY COLUMN `logo` longtext;--> statement-breakpoint
ALTER TABLE `teams` MODIFY COLUMN `logo` longtext;--> statement-breakpoint
ALTER TABLE `portals` ADD `banner` longtext;--> statement-breakpoint
ALTER TABLE `portals` ADD `fontFamily` varchar(100) DEFAULT 'Inter' NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `slider` longtext;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `sponsors` longtext;--> statement-breakpoint
ALTER TABLE `users` ADD `password` text;