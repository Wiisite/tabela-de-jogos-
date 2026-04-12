CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`phase` enum('group','semifinal','final','third_place') NOT NULL,
	`round` int NOT NULL DEFAULT 1,
	`homeTeamId` int NOT NULL,
	`awayTeamId` int NOT NULL,
	`homeScore` int,
	`awayScore` int,
	`homePenalties` int,
	`awayPenalties` int,
	`matchDate` varchar(50),
	`matchTime` varchar(50),
	`location` varchar(255),
	`status` enum('scheduled','finished') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`logo` text,
	`primaryColor` varchar(7) NOT NULL DEFAULT '#1e3a8a',
	`secondaryColor` varchar(7) NOT NULL DEFAULT '#f59e0b',
	`adminPassword` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portals_id` PRIMARY KEY(`id`),
	CONSTRAINT `portals_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`shortName` varchar(10) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#1e40af',
	`logo` text,
	`groupName` varchar(10) NOT NULL DEFAULT 'A',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`portalId` int NOT NULL DEFAULT 1,
	`name` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL DEFAULT 'Geral',
	`status` enum('pending','group_stage','semifinals','final','finished') NOT NULL DEFAULT 'pending',
	`champion` varchar(255),
	`sport` enum('football','basketball','volleyball','handball','futsal') NOT NULL DEFAULT 'football',
	`groupCount` int NOT NULL DEFAULT 1,
	`winPoints` int NOT NULL DEFAULT 3,
	`drawPoints` int NOT NULL DEFAULT 1,
	`lossPoints` int NOT NULL DEFAULT 0,
	`isDoubleRound` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tournaments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`portalId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
