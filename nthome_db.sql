-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 04, 2024 at 03:28 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `nthome_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `car_listing`
--

CREATE TABLE `car_listing` (
  `id` int(11) NOT NULL,
  `car_make` varchar(255) DEFAULT NULL,
  `car_model` varchar(255) DEFAULT NULL,
  `car_year` int(11) DEFAULT NULL,
  `number_of_seats` int(11) DEFAULT NULL,
  `car_colour` varchar(255) DEFAULT NULL,
  `car_image` varchar(255) DEFAULT NULL,
  `license_plate` varchar(50) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `class` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `car_listing`
--

INSERT INTO `car_listing` (`id`, `car_make`, `car_model`, `car_year`, `number_of_seats`, `car_colour`, `car_image`, `license_plate`, `userId`, `class`) VALUES
(5, 'toyota', 'corolla', 2023, 3, 'white', 'clpjdus5l0sivsfakc7wid9bu-corolla-accessories-601x460.desktop.png', '123 gp', 15, 1);

-- --------------------------------------------------------

--
-- Table structure for table `contact_support`
--

CREATE TABLE `contact_support` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` varchar(255) NOT NULL,
  `status` enum('unread','read') DEFAULT 'unread',
  `contact_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `contact_support`
--

INSERT INTO `contact_support` (`id`, `email`, `subject`, `message`, `status`, `contact_date`) VALUES
(1, 'Vuitisani@gmail.com', 'doing', 'done', 'read', '2024-08-25'),
(2, 'Ntshoveloboscar@gmail.com', 'why here', 'wherever', 'read', '2024-08-25'),
(3, 'Vuitisani@gmail.com', 'riding', 'how to ride?', 'read', '2024-08-27');

-- --------------------------------------------------------

--
-- Table structure for table `disability`
--

CREATE TABLE `disability` (
  `id` int(11) NOT NULL,
  `have_disability` tinyint(1) NOT NULL,
  `disability_type` varchar(255) DEFAULT NULL,
  `additional_details` text DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `disability`
--

INSERT INTO `disability` (`id`, `have_disability`, `disability_type`, `additional_details`, `user_id`) VALUES
(15, 0, NULL, NULL, 14),
(16, 0, NULL, NULL, 14),
(17, 0, NULL, NULL, 14),
(18, 0, NULL, NULL, 14),
(19, 0, NULL, NULL, 14),
(20, 0, NULL, NULL, 14),
(21, 0, NULL, NULL, 14),
(22, 0, NULL, NULL, 14),
(23, 0, NULL, NULL, 14),
(24, 0, NULL, NULL, 14),
(25, 0, NULL, NULL, 14),
(26, 0, NULL, NULL, 14),
(27, 0, NULL, NULL, 14),
(28, 0, NULL, NULL, 14),
(29, 0, NULL, NULL, 14),
(30, 0, NULL, NULL, 14),
(31, 0, NULL, NULL, 14),
(32, 0, NULL, NULL, 14),
(33, 0, NULL, NULL, 14),
(34, 0, NULL, NULL, 14),
(35, 0, NULL, NULL, 14),
(36, 0, NULL, NULL, 14),
(37, 0, NULL, NULL, 14),
(38, 0, NULL, NULL, 14),
(39, 0, NULL, NULL, 14),
(40, 0, NULL, NULL, 14),
(41, 0, NULL, NULL, 14),
(42, 0, NULL, NULL, 14),
(43, 0, NULL, NULL, 14),
(44, 0, NULL, NULL, 14),
(45, 0, NULL, NULL, 14),
(46, 0, NULL, NULL, 14),
(47, 0, NULL, NULL, 14),
(48, 0, NULL, NULL, 14),
(49, 0, NULL, NULL, 14),
(50, 0, NULL, NULL, 14),
(51, 0, NULL, NULL, 14),
(52, 0, NULL, NULL, 14),
(53, 0, NULL, NULL, 14);

-- --------------------------------------------------------

--
-- Table structure for table `driver`
--

CREATE TABLE `driver` (
  `id` int(11) NOT NULL,
  `photo` varchar(255) NOT NULL,
  `id_copy` varchar(255) NOT NULL,
  `gender` varchar(50) NOT NULL,
  `users_id` int(50) NOT NULL,
  `police_clearance` varchar(255) DEFAULT NULL,
  `pdp` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `state` varchar(50) DEFAULT 'online',
  `URL_payment` varchar(255) NOT NULL,
  `online_time` time DEFAULT '00:00:00',
  `last_online_timestamp` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `driver`
--

INSERT INTO `driver` (`id`, `photo`, `id_copy`, `gender`, `users_id`, `police_clearance`, `pdp`, `status`, `state`, `URL_payment`, `online_time`, `last_online_timestamp`) VALUES
(7, 'Screenshot (32).png', 'ZA_Smart_ID_Front.pdf', 'Male', 15, 'rpc-police-clearance.png', 'rpc-police-clearance.png', 'approved', 'online', 'https://paystack.com/pay/nthomedrivers', '00:00:00', '2024-09-03 03:01:39');

-- --------------------------------------------------------

--
-- Table structure for table `feedback`
--

CREATE TABLE `feedback` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `content` text NOT NULL,
  `rating` int(11) NOT NULL,
  `role` enum('driver','customer') NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `feedback`
--

INSERT INTO `feedback` (`id`, `userId`, `content`, `rating`, `role`, `createdAt`) VALUES
(2, 7, 'good', 5, 'driver', '2024-08-27 13:03:25'),
(3, 14, 'thank you ride', 5, 'driver', '2024-09-02 07:08:07'),
(4, 14, 'thabk you', 3, 'driver', '2024-09-02 07:37:01');

-- --------------------------------------------------------

--
-- Table structure for table `passwordresets`
--

CREATE TABLE `passwordresets` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `otp` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `passwordresets`
--

INSERT INTO `passwordresets` (`id`, `email`, `otp`, `expires_at`, `used`, `created_at`) VALUES
(1, 'leborobynlr1@gmail.com', '769365', '2024-08-28 01:14:58', 1, '2024-08-28 07:59:58'),
(2, 'leborobynlr1@gmail.com', '357860', '2024-09-02 00:17:11', 0, '2024-09-02 07:02:11'),
(3, 'leborobynlr1@gmail.com', '888859', '2024-09-02 00:18:42', 1, '2024-09-02 07:03:42');

-- --------------------------------------------------------

--
-- Table structure for table `payment`
--

CREATE TABLE `payment` (
  `id` int(11) NOT NULL,
  `tripId` int(11) NOT NULL,
  `paymentType` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paymentDate` timestamp NOT NULL DEFAULT current_timestamp(),
  `payment_reference` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment`
--

INSERT INTO `payment` (`id`, `tripId`, `paymentType`, `amount`, `paymentDate`, `payment_reference`) VALUES
(16, 9, 'Card', 41.56, '2024-09-02 16:04:05', '');

-- --------------------------------------------------------

--
-- Table structure for table `push_notifications`
--

CREATE TABLE `push_notifications` (
  `id` int(11) NOT NULL,
  `MessageTo` varchar(255) NOT NULL,
  `Message` text NOT NULL,
  `DateSent` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `push_notifications`
--

INSERT INTO `push_notifications` (`id`, `MessageTo`, `Message`, `DateSent`) VALUES
(1, 'customer', 'welcome to nthome', '2024-08-21 14:55:54'),
(2, 'customer', 'Thank you for the support', '2024-08-22 07:45:29'),
(3, 'customer', 'Thank you for the support', '2024-08-22 07:45:29'),
(4, 'customer', 'Thank you for the support', '2024-08-22 07:45:30'),
(5, 'customer', 'Thank you for the support', '2024-08-22 07:45:30'),
(6, 'driver', 'Thank you ', '2024-08-27 13:01:20'),
(7, 'driver', 'Thank you ', '2024-08-27 13:01:20'),
(8, 'driver', 'Thank you ', '2024-08-27 13:01:20');

-- --------------------------------------------------------

--
-- Table structure for table `site_settings`
--

CREATE TABLE `site_settings` (
  `id` int(11) NOT NULL,
  `companyName` varchar(255) NOT NULL,
  `supportEmail` varchar(255) NOT NULL,
  `supportPhone` varchar(255) NOT NULL,
  `driverNotifications` tinyint(1) NOT NULL,
  `riderNotifications` tinyint(1) NOT NULL,
  `promoNotifications` tinyint(1) NOT NULL,
  `baseFareBlack` decimal(10,2) NOT NULL,
  `baseFareX` decimal(10,2) NOT NULL,
  `perKMRateBlack` decimal(10,2) NOT NULL,
  `perKMRateX` decimal(10,2) NOT NULL,
  `perMonthRate` decimal(10,2) NOT NULL,
  `perWeekRate` decimal(10,2) NOT NULL,
  `workingHours` int(11) NOT NULL,
  `cancellationFee` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `site_settings`
--

INSERT INTO `site_settings` (`id`, `companyName`, `supportEmail`, `supportPhone`, `driverNotifications`, `riderNotifications`, `promoNotifications`, `baseFareBlack`, `baseFareX`, `perKMRateBlack`, `perKMRateX`, `perMonthRate`, `perWeekRate`, `workingHours`, `cancellationFee`) VALUES
(1, 'Nthome Ridez', 'info@nthome.com', '+27 84 234 6914 / +27 84 234 6918', 1, 1, 1, 16.00, 20.00, 15.00, 10.00, 1500.00, 400.00, 12, 5.00);

-- --------------------------------------------------------

--
-- Table structure for table `subscriptions`
--

CREATE TABLE `subscriptions` (
  `id` int(11) NOT NULL,
  `statuses` tinyint(1) NOT NULL,
  `plan_name` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_id` int(11) NOT NULL,
  `paystack_subscription_id` varchar(255) DEFAULT NULL,
  `verification_id` varchar(255) DEFAULT NULL,
  `customer_code` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subscriptions`
--

INSERT INTO `subscriptions` (`id`, `statuses`, `plan_name`, `amount`, `created_at`, `user_id`, `paystack_subscription_id`, `verification_id`, `customer_code`) VALUES
(5, 1, 'Weekly Plan', 4.00, '2024-09-04 14:21:12', 15, '2fwycgjkhi', '181856195', 'CUS_0dz0808t0sztw6x'),
(6, 1, 'Monthly Plan', 1500.00, '2024-09-04 14:25:10', 15, 'ac3uqwqqpq', '181856195', 'CUS_0dz0808t0sztw6x'),
(7, 1, 'Monthly Plan', 1500.00, '2024-09-04 16:38:42', 15, '5pmwzuu3uq', '181856195', 'CUS_0dz0808t0sztw6x');

-- --------------------------------------------------------

--
-- Table structure for table `trip`
--

CREATE TABLE `trip` (
  `id` int(11) NOT NULL,
  `customerId` int(11) DEFAULT NULL,
  `driverId` int(11) DEFAULT NULL,
  `requestDate` datetime DEFAULT NULL,
  `currentDate` datetime DEFAULT NULL,
  `pickUpLocation` varchar(255) DEFAULT NULL,
  `dropOffLocation` varchar(255) DEFAULT NULL,
  `statuses` varchar(50) DEFAULT NULL,
  `duration_minutes` int(11) DEFAULT NULL,
  `vehicle_type` varchar(50) DEFAULT NULL,
  `distance_traveled` decimal(10,2) DEFAULT NULL,
  `payment_status` varchar(50) DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `cancel_by` varchar(20) DEFAULT NULL,
  `pickupTime` time DEFAULT NULL,
  `dropOffTime` time DEFAULT NULL,
  `driver_ratings` decimal(2,1) DEFAULT NULL,
  `driver_feedback` text DEFAULT NULL,
  `customer_rating` decimal(2,1) DEFAULT NULL,
  `customer_feedback` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `trip`
--

INSERT INTO `trip` (`id`, `customerId`, `driverId`, `requestDate`, `currentDate`, `pickUpLocation`, `dropOffLocation`, `statuses`, `duration_minutes`, `vehicle_type`, `distance_traveled`, `payment_status`, `cancellation_reason`, `cancel_by`, `pickupTime`, `dropOffTime`, `driver_ratings`, `driver_feedback`, `customer_rating`, `customer_feedback`) VALUES
(9, 14, 15, '2024-09-02 09:04:05', '2024-09-03 10:01:32', 'Pretoria-Wes', 'Pretoria', 'cancelled', NULL, 'nthome_black', 2.77, 'Yes', 'busy', 'Boscar', NULL, NULL, NULL, NULL, NULL, NULL),
(10, 14, 15, '2024-09-04 08:57:38', '2024-09-04 09:43:48', 'Pretoria-Wes', 'Pretoria', 'cancelled', NULL, 'nthome_black', 2.77, NULL, 'no', 'Boscar', NULL, NULL, NULL, NULL, NULL, NULL),
(11, 14, 15, '2024-09-04 09:11:37', '2024-09-04 09:43:59', 'Margate', 'Pretoria-Wes', 'cancelled', NULL, 'nthome_black', 607.84, NULL, 'no\n', 'Boscar', NULL, NULL, NULL, NULL, NULL, NULL),
(12, 14, 15, '2024-09-04 09:15:26', '2024-09-04 09:44:08', 'Marquard', 'Pretoria', 'cancelled', NULL, 'nthome_black', 332.93, NULL, 'no', 'Boscar', NULL, NULL, NULL, NULL, NULL, NULL),
(13, 14, 15, '2024-09-04 09:16:12', '2024-09-04 09:44:15', 'Marquard', 'Pretoria', 'cancelled', NULL, 'nthome_black', 332.93, NULL, 'no', 'Boscar', NULL, NULL, NULL, NULL, NULL, NULL),
(14, 14, 15, '2024-09-04 09:17:22', '2024-09-04 09:44:20', 'Pretoria-Wes', 'Marowe', 'cancelled', NULL, 'nthome_black', 273.44, NULL, 'no', 'Boscar', NULL, NULL, NULL, NULL, NULL, NULL),
(15, 14, 15, '2024-09-04 09:24:39', '2024-09-04 09:44:26', 'Pretoria-Wes', 'Margate', 'cancelled', NULL, 'nthome_black', 607.84, NULL, 'no', 'Boscar', NULL, NULL, NULL, NULL, NULL, NULL),
(16, 14, 15, '2024-09-04 09:29:05', '2024-09-04 09:44:32', 'Pretoria', 'Pretoria-Wes', 'cancelled', NULL, 'nthome_black', 2.77, NULL, 'no', 'Boscar', NULL, NULL, NULL, NULL, NULL, NULL),
(17, 14, 15, '2024-09-04 09:46:21', '2024-09-04 09:46:21', 'Pretoria-Wes', 'Pretoria', 'pending', NULL, 'nthome_black', 2.77, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(18, 14, 15, '2024-09-04 09:57:05', '2024-09-04 09:57:05', 'Pretoria-Wes', 'Pretoria', 'pending', NULL, 'nthome_black', 2.77, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(19, 14, 15, '2024-09-04 10:18:24', '2024-09-04 10:18:24', 'Pretoria-Wes', 'Pretoria', 'pending', NULL, 'nthome_black', 2.77, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(20, 14, 15, '2024-09-04 10:19:05', '2024-09-04 10:19:05', 'Pretoria-Wes', 'Durban', 'pending', NULL, 'nthome_black', 536.38, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(21, 14, 15, '2024-09-04 10:27:28', '2024-09-04 10:27:28', 'Pretoria-Wes', 'Pretoria', 'pending', NULL, 'nthome_black', 2.77, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(22, 14, 15, '2024-09-04 10:31:59', '2024-09-04 10:31:59', 'Pretoria-Wes', 'Pretoria', 'pending', NULL, 'nthome_black', 2.77, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(23, 14, 15, '2024-09-04 12:07:23', '2024-09-04 12:07:23', 'Pretoria-Wes', 'Pretoria', 'pending', NULL, 'nthome_black', 2.77, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(24, 14, 15, '2024-09-04 12:14:34', '2024-09-04 12:14:34', 'The Village', 'The Highlands', 'pending', NULL, 'nthome_black', 502.17, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(25, 14, 15, '2024-09-04 12:20:40', '2024-09-04 12:20:40', 'Pretoria-Wes', 'Pretoria', 'pending', NULL, 'nthome_black', 2.77, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(26, 14, 15, '2024-09-04 12:25:38', '2024-09-04 12:25:38', 'Pretoria', 'Pretoria-Wes', 'pending', NULL, 'nthome_black', 2.77, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(27, 14, 15, '2024-09-04 12:29:28', '2024-09-04 12:29:28', 'Pretoria-Wes', 'Pretoria', 'pending', NULL, 'nthome_black', 2.77, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(28, 14, 15, '2024-09-04 12:37:47', '2024-09-04 12:37:47', 'Pretoria-Wes', 'Pretoria', 'pending', NULL, 'nthome_black', 2.77, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(29, 14, 15, '2024-09-04 12:41:59', '2024-09-04 12:41:59', 'Pretoria-Wes', 'Durban', 'pending', NULL, 'nthome_black', 536.38, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(30, 14, 15, '2024-09-04 12:48:00', '2024-09-04 12:48:00', 'Pretoria-Wes', 'The Village', 'pending', NULL, 'nthome_black', 515.06, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(31, 14, 15, '2024-09-04 12:56:40', '2024-09-04 12:56:40', 'Pretoria-Wes', 'Pretoria', 'pending', NULL, 'nthome_black', 2.77, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(32, 14, 15, '2024-09-04 13:11:22', '2024-09-04 13:11:22', 'Pretoria', 'Pretoria-Wes', 'pending', NULL, 'nthome_black', 2.77, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `password` varchar(50) NOT NULL,
  `role` varchar(100) NOT NULL,
  `phoneNumber` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `lastName` varchar(100) DEFAULT NULL,
  `current_address` varchar(255) DEFAULT NULL,
  `gender` enum('male','female') NOT NULL,
  `profile_picture` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `phoneNumber`, `address`, `lastName`, `current_address`, `gender`, `profile_picture`) VALUES
(1, 'Admin', 'Admin@gmail.com', 'Admin@123', 'admin', '0712345689', '123 sec A GP', 'Nthome', 'mamelodi ext 4', 'male', 'black-woman-arms-crossed-standing-600nw-2254569139-1724309117249.jpg'),
(14, 'vuyisile', 'leborobynlr1@gmail.com', 'Lesego30$', 'customer', '0677132638', '121 block f', 'memane', NULL, 'female', NULL),
(15, 'Boscar', 'boscar@gmail.com', 'Boscar12#', 'driver', NULL, NULL, NULL, NULL, '', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `vehicle`
--

CREATE TABLE `vehicle` (
  `id` int(11) NOT NULL,
  `name` varchar(20) NOT NULL,
  `image` varchar(255) NOT NULL,
  `costPerKm` decimal(10,2) NOT NULL,
  `status` varchar(20) NOT NULL,
  `description` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vehicle`
--

INSERT INTO `vehicle` (`id`, `name`, `image`, `costPerKm`, `status`, `description`) VALUES
(1, 'nthome_black', 'nthome_black.png\n', 15.00, 'Active', 'Luxury'),
(2, 'nthome_x', 'nthome_x.png', 10.00, 'Active', 'Executive');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `car_listing`
--
ALTER TABLE `car_listing`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`),
  ADD KEY `fk_car_listing_class` (`class`);

--
-- Indexes for table `contact_support`
--
ALTER TABLE `contact_support`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `disability`
--
ALTER TABLE `disability`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `driver`
--
ALTER TABLE `driver`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Test` (`users_id`);

--
-- Indexes for table `feedback`
--
ALTER TABLE `feedback`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `passwordresets`
--
ALTER TABLE `passwordresets`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payment`
--
ALTER TABLE `payment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tripId` (`tripId`);

--
-- Indexes for table `push_notifications`
--
ALTER TABLE `push_notifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `site_settings`
--
ALTER TABLE `site_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `trip`
--
ALTER TABLE `trip`
  ADD PRIMARY KEY (`id`),
  ADD KEY `customerId` (`customerId`),
  ADD KEY `driverId` (`driverId`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_roles` (`role`);

--
-- Indexes for table `vehicle`
--
ALTER TABLE `vehicle`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `car_listing`
--
ALTER TABLE `car_listing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `contact_support`
--
ALTER TABLE `contact_support`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `disability`
--
ALTER TABLE `disability`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT for table `driver`
--
ALTER TABLE `driver`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `feedback`
--
ALTER TABLE `feedback`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `passwordresets`
--
ALTER TABLE `passwordresets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `payment`
--
ALTER TABLE `payment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `push_notifications`
--
ALTER TABLE `push_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `site_settings`
--
ALTER TABLE `site_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `subscriptions`
--
ALTER TABLE `subscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `trip`
--
ALTER TABLE `trip`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `vehicle`
--
ALTER TABLE `vehicle`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `car_listing`
--
ALTER TABLE `car_listing`
  ADD CONSTRAINT `car_listing_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_car_listing_class` FOREIGN KEY (`class`) REFERENCES `vehicle` (`id`);

--
-- Constraints for table `disability`
--
ALTER TABLE `disability`
  ADD CONSTRAINT `disability_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `driver`
--
ALTER TABLE `driver`
  ADD CONSTRAINT `Test` FOREIGN KEY (`users_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `payment`
--
ALTER TABLE `payment`
  ADD CONSTRAINT `payment_ibfk_1` FOREIGN KEY (`tripId`) REFERENCES `trip` (`id`);

--
-- Constraints for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `trip`
--
ALTER TABLE `trip`
  ADD CONSTRAINT `trip_ibfk_1` FOREIGN KEY (`customerId`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `trip_ibfk_2` FOREIGN KEY (`driverId`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
