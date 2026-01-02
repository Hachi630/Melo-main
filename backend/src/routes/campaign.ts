import express, { Request, Response } from 'express'
import { protect } from '../middleware/auth'
import { AuthRequest } from '../types'
import Campaign from '../models/Campaign'

const router = express.Router()

// @desc    Get all campaigns for user
// @route   GET /api/campaigns
// @access  Private
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const campaigns = await Campaign.find({ userId: user._id }).sort({
      startDate: -1,
    })

    res.json({
      success: true,
      campaigns: campaigns.map((campaign) => ({
        id: campaign._id.toString(),
        userId: campaign.userId.toString(),
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate.toISOString().split('T')[0],
        endDate: campaign.endDate.toISOString().split('T')[0],
        status: campaign.status,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      })),
    })
  } catch (error: any) {
    console.error('Get campaigns error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get campaigns',
    })
  }
})

// @desc    Get single campaign
// @route   GET /api/campaigns/:id
// @access  Private
router.get('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: user._id,
    })

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' })
    }

    res.json({
      success: true,
      campaign: {
        id: campaign._id.toString(),
        userId: campaign.userId.toString(),
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate.toISOString().split('T')[0],
        endDate: campaign.endDate.toISOString().split('T')[0],
        status: campaign.status,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('Get campaign error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get campaign',
    })
  }
})

// @desc    Create campaign
// @route   POST /api/campaigns
// @access  Private
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const { name, description, startDate, endDate, status } = req.body

    // Validate required fields
    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'name, startDate, and endDate are required',
      })
    }

    const campaign = await Campaign.create({
      userId: user._id,
      name,
      description: description || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || 'draft',
    })

    res.status(201).json({
      success: true,
      campaign: {
        id: campaign._id.toString(),
        userId: campaign.userId.toString(),
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate.toISOString().split('T')[0],
        endDate: campaign.endDate.toISOString().split('T')[0],
        status: campaign.status,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('Create campaign error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create campaign',
    })
  }
})

// @desc    Update campaign
// @route   PUT /api/campaigns/:id
// @access  Private
router.put('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: user._id,
    })

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' })
    }

    const { name, description, startDate, endDate, status } = req.body

    // Update fields
    if (name !== undefined) campaign.name = name
    if (description !== undefined) campaign.description = description
    if (startDate !== undefined) campaign.startDate = new Date(startDate)
    if (endDate !== undefined) campaign.endDate = new Date(endDate)
    if (status !== undefined) campaign.status = status

    await campaign.save()

    res.json({
      success: true,
      campaign: {
        id: campaign._id.toString(),
        userId: campaign.userId.toString(),
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate.toISOString().split('T')[0],
        endDate: campaign.endDate.toISOString().split('T')[0],
        status: campaign.status,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('Update campaign error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update campaign',
    })
  }
})

// @desc    Delete campaign
// @route   DELETE /api/campaigns/:id
// @access  Private
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const campaign = await Campaign.findOneAndDelete({
      _id: req.params.id,
      userId: user._id,
    })

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' })
    }

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    })
  } catch (error: any) {
    console.error('Delete campaign error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete campaign',
    })
  }
})

export default router

